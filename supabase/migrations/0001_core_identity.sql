-- Core identity domain: organizations, campuses, people, households, roles &
-- permissions. Authentication identity (auth.users) is deliberately kept
-- separate from church-person identity (profiles) — a person can exist in
-- the church database before ever creating a login, and a login later links
-- to their existing profile by matching email.

create extension if not exists citext;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- organizations ---------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  default_currency char(3) not null default 'JMD',
  timezone text not null default 'America/Jamaica',
  created_at timestamptz not null default now()
);

-- campuses ----------------------------------------------------------------
create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug citext not null,
  name text not null,
  address_line1 text,
  address_line2 text,
  city text,
  parish text,
  postal_code text,
  country text not null default 'Jamaica',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  phone text,
  email citext,
  service_schedule jsonb not null default '[]'::jsonb,
  livestream_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

-- households ----------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- profiles: the canonical church-person record ------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  first_name text,
  last_name text,
  email citext,
  phone text,
  date_of_birth date,
  gender text,
  membership_status text not null default 'visitor'
    check (membership_status in ('visitor', 'returning_visitor', 'attendee', 'prospective_member', 'member', 'inactive')),
  preferred_contact_method text
    check (preferred_contact_method in ('email', 'sms', 'whatsapp', 'phone')),
  communication_email_opt_in boolean not null default true,
  communication_sms_opt_in boolean not null default false,
  notes text,
  avatar_path text,
  joined_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_org_idx on public.profiles (organization_id);
create index profiles_campus_idx on public.profiles (campus_id);
create index profiles_household_idx on public.profiles (household_id);
create index profiles_name_idx on public.profiles (organization_id, last_name, first_name);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- roles & permissions ---------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.permissions (
  code text primary key,
  description text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_id, permission_code)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

create unique index user_roles_unique_grant
  on public.user_roles (organization_id, user_id, role_id, coalesce(campus_id, '00000000-0000-0000-0000-000000000000'));
create index user_roles_user_idx on public.user_roles (organization_id, user_id);

-- audit log ----------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);

-- permission-check helper (used throughout RLS policies) --------------------
create or replace function public.has_permission(org uuid, permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = (select auth.uid())
      and ur.organization_id = org
      and rp.permission_code = permission
  );
$$;

-- resolves the calling auth user to their church profile id -----------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where auth_user_id = (select auth.uid()) limit 1;
$$;

-- auto-create (or link) a profile whenever a new auth user is created -------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_org uuid;
  linked_id uuid;
begin
  select id into default_org from public.organizations order by created_at asc limit 1;
  if default_org is null then
    return new;
  end if;

  -- link to a pre-existing staff-created profile with the same email, if any
  update public.profiles
     set auth_user_id = new.id
   where auth_user_id is null
     and organization_id = default_org
     and lower(email) = lower(new.email)
   returning id into linked_id;

  if linked_id is null then
    insert into public.profiles (auth_user_id, organization_id, email)
    values (new.id, default_org, new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- audit user_roles changes ---------------------------------------------------
create or replace function public.audit_user_roles_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (new.organization_id, (select auth.uid()), 'role.granted', 'user_roles', new.id::text,
      jsonb_build_object('user_id', new.user_id, 'role_id', new.role_id, 'campus_id', new.campus_id));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (old.organization_id, (select auth.uid()), 'role.revoked', 'user_roles', old.id::text,
      jsonb_build_object('user_id', old.user_id, 'role_id', old.role_id, 'campus_id', old.campus_id));
    return old;
  end if;
  return null;
end;
$$;

create trigger user_roles_audit
  after insert or delete on public.user_roles
  for each row execute function public.audit_user_roles_change();
