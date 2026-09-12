-- In-app notification inbox — the bell shown in every dashboard's topbar.
-- Distinct from `pastor_broadcasts`/`announcements` (which are one-to-many
-- posts everyone can read) and `notification_preferences` (which only ever
-- controlled whether *external* email/SMS should go out): this is a real
-- per-person feed of "something changed that involves you" events, e.g.
-- "your role was changed to Secretary". Rows are written exclusively by
-- the server (service role) — there is no insert policy for the
-- authenticated role — the person it belongs to can only read and mark
-- their own as read.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications own read" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Only lets someone flip read_at on their own rows — no other column can
-- meaningfully change from the client, but restrict the check anyway.
create policy "notifications own mark read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
