-- Two-way Google Calendar sync.
--
-- Until now a connected Google calendar was a one-way mirror: every sync
-- rewrote Google from the website and deleted anything it had not put there
-- itself. This adds what a real two-way sync needs:
--   * where each entry came from, and when it last changed;
--   * a record, per connection, of which Google entry is which website entry
--     and what both sides last agreed on (so "who changed it" can be told);
--   * a plain-language history of what the sync did, shown to the people
--     whose calendar it is;
--   * room for Google's entries on the website — Google calendars happily
--     hold overlapping entries, which the website used to forbid outright.

-- 1. Where an entry came from, and when it last changed -----------------
alter table public.pastoral_calendar_events
  add column if not exists source text not null default 'platform',
  add column if not exists updated_at timestamptz not null default now();
alter table public.pastoral_calendar_events drop constraint if exists pastoral_calendar_events_source_check;
alter table public.pastoral_calendar_events add constraint pastoral_calendar_events_source_check check (source in ('platform', 'google'));

drop trigger if exists pastoral_calendar_events_set_updated_at on public.pastoral_calendar_events;
create trigger pastoral_calendar_events_set_updated_at before update on public.pastoral_calendar_events
  for each row execute function public.set_updated_at();

-- 2. Overlaps ------------------------------------------------------------
-- The old rule: nothing on a person's calendar may overlap anything else.
-- Entries that arrive from Google cannot be refused for overlapping — the
-- pastor really can be double-booked, and hiding half of it would defeat the
-- point of a synced calendar. So the hard database rule now covers what must
-- never double up (booked counselling appointments), and a trigger keeps the
-- old protection for everything people type into the website: a platform
-- entry still cannot be placed over an appointment or another platform entry.
alter table public.pastoral_calendar_events drop constraint if exists pastoral_calendar_no_overlap;
alter table public.pastoral_calendar_events add constraint pastoral_calendar_no_overlap
  exclude using gist (profile_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (counsel_request_id is not null);

create or replace function private.guard_entry_overlap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- guard_calendar_write has already locked this person's profile row, so
  -- the check below cannot race with another write to the same calendar.
  if new.source = 'platform' and exists (
    select 1 from public.pastoral_calendar_events e
    where e.profile_id = new.profile_id and e.id <> new.id
      and e.starts_at < new.ends_at and e.ends_at > new.starts_at
      and (e.counsel_request_id is not null or e.source = 'platform')
  ) then
    raise exception 'That time overlaps something already on this calendar.' using errcode = '23P01';
  end if;
  return new;
end $$;
revoke all on function private.guard_entry_overlap() from public, anon, authenticated;
drop trigger if exists guard_entry_overlap on public.pastoral_calendar_events;
create trigger guard_entry_overlap before insert or update of starts_at, ends_at, profile_id, source on public.pastoral_calendar_events
  for each row execute function private.guard_entry_overlap();

-- 3. A change made by the sync is not news to the calendar's owner -------
-- The accountability trigger tells a person when someone else changes their
-- calendar. A change with no signed-in user at all is the Google sync acting
-- on the calendar's own behalf (the owner or their assistant made the edit in
-- Google), so it is recorded in the audit log but does not raise a bell.
create or replace function private.calendar_accountability() returns trigger language plpgsql security definer set search_path = '' as $$
declare person uuid; org uuid; owner_user uuid; actor_name text; row_id uuid;
begin
  person := case when tg_op = 'DELETE' then old.profile_id else new.profile_id end;
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  select organization_id, auth_user_id into org, owner_user from public.profiles where id = person;
  if tg_when = 'BEFORE' then
    if tg_op = 'INSERT' then new.created_by := auth.uid(); else new.created_by := old.created_by; end if;
    new.updated_by := auth.uid();
    return new;
  end if;
  select concat_ws(' ', first_name, last_name) into actor_name from public.profiles where auth_user_id = auth.uid();
  if auth.uid() is null then actor_name := 'Google Calendar sync'; end if;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (org, auth.uid(), 'calendar.' || lower(tg_op), tg_table_name, row_id::text, jsonb_build_object('calendar_profile_id', person, 'actor_name', actor_name));
  if owner_user is not null and auth.uid() is not null and auth.uid() is distinct from owner_user then
    insert into public.notifications(organization_id, user_id, type, title, body, url)
      values (org, owner_user, 'calendar', 'Your calendar was updated',
        coalesce(nullif(actor_name, ''), 'Church office') || ' ' || lower(tg_op) || 'd a calendar entry or working hours.', '/pastor/calendar');
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- 4. Which Google entry is which website entry ----------------------------
alter table public.calendar_connections add column if not exists sync_lock_until timestamptz;

create table if not exists public.calendar_event_links (
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  -- Deliberately no foreign key: when a website entry is deleted its link
  -- must outlive it, or the sync could not tell that the Google copy should go too.
  event_id uuid not null,
  google_event_id text not null,
  -- Fingerprint of the content both sides last agreed on; see lib/calendar/sync-core.ts.
  synced_hash text not null,
  google_updated timestamptz,
  synced_at timestamptz not null default now(),
  primary key (connection_id, event_id),
  unique (connection_id, google_event_id)
);

create table if not exists public.calendar_sync_log (
  id bigint generated always as identity primary key,
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  direction text not null check (direction in ('from_google', 'to_google', 'info')),
  action text not null check (action in ('created', 'updated', 'deleted', 'restored', 'error', 'info')),
  title text,
  detail text not null,
  created_at timestamptz not null default now()
);
create index if not exists calendar_sync_log_connection_idx on public.calendar_sync_log (connection_id, id desc);

-- Server access only, like the other calendar connection tables.
do $$ declare t text; begin
  foreach t in array array['calendar_event_links', 'calendar_sync_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- 5. Let open calendars refresh the moment something changes --------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.pastoral_calendar_events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
  end if;
end $$;
