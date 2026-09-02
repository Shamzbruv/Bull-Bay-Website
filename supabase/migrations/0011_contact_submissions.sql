-- Public contact / first-visit / connection-card submissions, feeding the
-- admin visitor follow-up pipeline (blueprint P0 "Contact / first visit").

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('contact', 'connection_card')),
  first_name text,
  last_name text,
  email citext,
  phone text,
  interest text,
  message text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_submissions_org_idx on public.contact_submissions (organization_id, status, created_at desc);

alter table public.contact_submissions enable row level security;
create policy "contact_submissions submit" on public.contact_submissions
  for insert to anon, authenticated with check (true);
create policy "contact_submissions staff read" on public.contact_submissions
  for select to authenticated using (public.has_permission(organization_id, 'people.write'));
create policy "contact_submissions staff manage" on public.contact_submissions
  for update to authenticated
  using (public.has_permission(organization_id, 'people.write'))
  with check (public.has_permission(organization_id, 'people.write'));
create policy "contact_submissions staff delete" on public.contact_submissions
  for delete to authenticated using (public.has_permission(organization_id, 'people.write'));
