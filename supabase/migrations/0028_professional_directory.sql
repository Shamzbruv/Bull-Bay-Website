-- Members can opt in to a professional-help directory: their occupation
-- and a short blurb become visible to other signed-in members (never the
-- public site), and other members reach them through a request — never a
-- raw email/phone handout — so nothing beyond what they typed here is ever
-- exposed. The directory view exists specifically so this stays possible
-- without a broad "members can read other members' profiles" RLS policy.
alter table public.profiles
  add column occupation text,
  add column professional_bio text,
  add column open_to_professional_requests boolean not null default false;

create view public.professional_directory
  with (security_invoker = false)
  as
  select id as profile_id, organization_id, first_name, last_name, occupation, professional_bio
  from public.profiles
  where open_to_professional_requests and occupation is not null and occupation <> '';

grant select on public.professional_directory to authenticated;

create table public.professional_help_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status text not null default 'sent' check (status in ('sent', 'responded', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_profile_id <> target_profile_id)
);
create trigger professional_help_requests_set_updated_at before update on public.professional_help_requests
  for each row execute function public.set_updated_at();
create index professional_help_requests_target_idx on public.professional_help_requests (target_profile_id, status);
create index professional_help_requests_requester_idx on public.professional_help_requests (requester_profile_id);

alter table public.professional_help_requests enable row level security;
create policy "professional_help_requests own read" on public.professional_help_requests
  for select to authenticated
  using (requester_profile_id = public.current_profile_id() or target_profile_id = public.current_profile_id());
create policy "professional_help_requests create" on public.professional_help_requests
  for insert to authenticated
  with check (requester_profile_id = public.current_profile_id());
create policy "professional_help_requests respond" on public.professional_help_requests
  for update to authenticated
  using (target_profile_id = public.current_profile_id() or requester_profile_id = public.current_profile_id())
  with check (target_profile_id = public.current_profile_id() or requester_profile_id = public.current_profile_id());
