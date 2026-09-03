-- Pastor + pastoral team (deacons/elders/JPs) availability calendars, and
-- counselling requests booked against them. The pastor's own calendar is
-- the one shown prominently on the member dashboard; pastoral-team members
-- appear only under "Request help from the pastoral team".

create table public.pastoral_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_title text not null,
  is_trained_counselor boolean not null default false,
  is_pastor boolean not null default false,
  bio text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create trigger pastoral_team_members_set_updated_at before update on public.pastoral_team_members
  for each row execute function public.set_updated_at();

-- Recurring weekly working hours (e.g. "in the office Mon-Fri 9-5").
create table public.pastoral_calendar_availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index pastoral_calendar_availability_profile_idx on public.pastoral_calendar_availability (profile_id, day_of_week);

-- Specific dated entries: day-off overrides, one-off busy blocks, and
-- scheduled counselling appointments.
create table public.pastoral_calendar_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'busy' check (kind in ('day_off', 'busy', 'appointment')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  counsel_request_id uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index pastoral_calendar_events_profile_idx on public.pastoral_calendar_events (profile_id, starts_at);

create table public.counsel_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_profile_id uuid references public.profiles(id) on delete set null,
  requested_with_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  is_urgent boolean not null default false,
  preferred_date date,
  preferred_time time,
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'completed', 'declined', 'cancelled')),
  scheduled_event_id uuid references public.pastoral_calendar_events(id) on delete set null,
  staff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger counsel_requests_set_updated_at before update on public.counsel_requests
  for each row execute function public.set_updated_at();
create index counsel_requests_requested_with_idx on public.counsel_requests (requested_with_profile_id, status);

alter table public.pastoral_calendar_events
  add constraint pastoral_calendar_events_counsel_request_fkey
  foreign key (counsel_request_id) references public.counsel_requests(id) on delete set null;

insert into public.permissions (code, description) values
  ('pastoral_calendar.manage', 'Administratively manage any pastoral team member''s calendar');

insert into public.role_permissions (role_id, permission_code)
select r.id, 'pastoral_calendar.manage' from public.roles r where r.code = 'church_admin';
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where r.code = 'super_admin' and p.code = 'pastoral_calendar.manage'
on conflict do nothing;

-- RLS ------------------------------------------------------------------
alter table public.pastoral_team_members enable row level security;
create policy "pastoral_team_members authenticated read" on public.pastoral_team_members
  for select to authenticated using (is_active);
create policy "pastoral_team_members staff manage" on public.pastoral_team_members
  for all to authenticated
  using (public.has_permission(organization_id, 'pastoral_calendar.manage'))
  with check (public.has_permission(organization_id, 'pastoral_calendar.manage'));

alter table public.pastoral_calendar_availability enable row level security;
create policy "pastoral_calendar_availability authenticated read" on public.pastoral_calendar_availability
  for select to authenticated using (true);
create policy "pastoral_calendar_availability self manage" on public.pastoral_calendar_availability
  for all to authenticated
  using (profile_id = public.current_profile_id() or exists (select 1 from public.profiles p where p.id = profile_id and public.has_permission(p.organization_id, 'pastoral_calendar.manage')))
  with check (profile_id = public.current_profile_id() or exists (select 1 from public.profiles p where p.id = profile_id and public.has_permission(p.organization_id, 'pastoral_calendar.manage')));

alter table public.pastoral_calendar_events enable row level security;
create policy "pastoral_calendar_events authenticated read" on public.pastoral_calendar_events
  for select to authenticated using (visibility = 'public' or profile_id = public.current_profile_id());
create policy "pastoral_calendar_events self manage" on public.pastoral_calendar_events
  for all to authenticated
  using (profile_id = public.current_profile_id() or exists (select 1 from public.profiles p where p.id = profile_id and public.has_permission(p.organization_id, 'pastoral_calendar.manage')))
  with check (profile_id = public.current_profile_id() or exists (select 1 from public.profiles p where p.id = profile_id and public.has_permission(p.organization_id, 'pastoral_calendar.manage')));

alter table public.counsel_requests enable row level security;
create policy "counsel_requests own read" on public.counsel_requests
  for select to authenticated using (requester_profile_id = public.current_profile_id() or requested_with_profile_id = public.current_profile_id());
create policy "counsel_requests create" on public.counsel_requests
  for insert to authenticated with check (requester_profile_id = public.current_profile_id());
create policy "counsel_requests staff read" on public.counsel_requests
  for select to authenticated using (public.has_permission(organization_id, 'care.manage'));
create policy "counsel_requests respond" on public.counsel_requests
  for update to authenticated
  using (requested_with_profile_id = public.current_profile_id() or public.has_permission(organization_id, 'care.manage'))
  with check (requested_with_profile_id = public.current_profile_id() or public.has_permission(organization_id, 'care.manage'));
