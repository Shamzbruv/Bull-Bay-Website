-- Pastoral care domain. Deliberately the most locked-down tables in the
-- schema: no broad "admin" role should be able to read these by default,
-- only explicit care-team grants (see 0007 RLS policies).

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  submitter_profile_id uuid references public.profiles(id) on delete set null,
  submitter_name text,
  submitter_contact text,
  request_body text not null,
  visibility text not null default 'confidential' check (visibility in ('confidential', 'prayer_team', 'public')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'prayed', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger prayer_requests_set_updated_at before update on public.prayer_requests
  for each row execute function public.set_updated_at();
create index prayer_requests_org_idx on public.prayer_requests (organization_id, status, created_at desc);

create table public.care_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_profile_id uuid references public.profiles(id) on delete set null,
  category text,
  summary text,
  confidential_notes text,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger care_cases_set_updated_at before update on public.care_cases
  for each row execute function public.set_updated_at();

-- explicit, auditable access grants — a care case is visible only to its
-- owner plus anyone named here, regardless of their other permissions.
create table public.care_case_access (
  case_id uuid not null references public.care_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create or replace function public.audit_care_case_access_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'care.access_granted', 'care_cases', new.case_id::text,
      jsonb_build_object('user_id', new.user_id));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'care.access_revoked', 'care_cases', old.case_id::text,
      jsonb_build_object('user_id', old.user_id));
    return old;
  end if;
  return null;
end;
$$;

create trigger care_case_access_audit
  after insert or delete on public.care_case_access
  for each row execute function public.audit_care_case_access_change();
