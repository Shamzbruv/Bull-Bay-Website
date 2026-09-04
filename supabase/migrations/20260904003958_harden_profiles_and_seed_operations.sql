-- Harden member-editable profile data, make document request types visible
-- to members in the same church, and provide useful first-run defaults.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- RLS controls rows, not columns. A signed-in member previously had UPDATE
-- access to every column on their own profile, including role-sensitive
-- fields such as organization_id, membership_status and
-- must_change_password. Keep self-service updates to an explicit allowlist.
create or replace function private.enforce_profile_self_service_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and old.auth_user_id = (select auth.uid())
     and not public.has_permission(old.organization_id, 'people.write')
     and (
       to_jsonb(new) - array[
         'first_name', 'last_name', 'phone', 'date_of_birth', 'gender',
         'preferred_contact_method', 'communication_email_opt_in',
         'communication_sms_opt_in', 'avatar_path', 'household_id',
         'job_title', 'employer', 'marital_status', 'address_line1', 'city',
         'parish', 'emergency_contact_name', 'emergency_contact_phone',
         'occupation', 'professional_bio', 'open_to_professional_requests',
         'updated_at'
       ]::text[]
     ) is distinct from (
       to_jsonb(old) - array[
         'first_name', 'last_name', 'phone', 'date_of_birth', 'gender',
         'preferred_contact_method', 'communication_email_opt_in',
         'communication_sms_opt_in', 'avatar_path', 'household_id',
         'job_title', 'employer', 'marital_status', 'address_line1', 'city',
         'parish', 'emergency_contact_name', 'emergency_contact_phone',
         'occupation', 'professional_bio', 'open_to_professional_requests',
         'updated_at'
       ]::text[]
     )
  then
    raise exception 'Only approved self-service profile fields may be changed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_profile_self_service_columns() from public, anon, authenticated;

drop trigger if exists profiles_enforce_self_service_columns on public.profiles;
create trigger profiles_enforce_self_service_columns
  before update on public.profiles
  for each row execute function private.enforce_profile_self_service_columns();

-- These helpers are intentionally available only to authenticated users;
-- each one derives authorization from auth.uid() internally.
revoke all on function public.has_permission(uuid, text) from public, anon;
grant execute on function public.has_permission(uuid, text) to authenticated;
revoke all on function public.current_profile_id() from public, anon;
-- Anonymous prayer/event submissions already reference this helper in an
-- RLS predicate; with no auth.uid() it safely returns null.
grant execute on function public.current_profile_id() to anon, authenticated;

-- Members need the active template catalogue in order to submit a request.
drop policy if exists "document_templates member read" on public.document_templates;
create policy "document_templates member read" on public.document_templates
  for select to authenticated
  using (
    is_active
    and exists (
      select 1
      from public.profiles viewer
      where viewer.id = public.current_profile_id()
        and viewer.organization_id = document_templates.organization_id
    )
  );

-- Professional directory entries are deliberately denormalized into their
-- own safe table. This avoids an owner-bypass view exposing any profile
-- columns that were not explicitly chosen for the directory.
drop view if exists public.professional_directory;
create table public.professional_directory (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text,
  last_name text,
  occupation text not null,
  professional_bio text,
  updated_at timestamptz not null default now()
);
create index professional_directory_org_occupation_idx
  on public.professional_directory (organization_id, occupation);

alter table public.professional_directory enable row level security;
create policy "professional_directory same church read"
  on public.professional_directory
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles viewer
      where viewer.auth_user_id = (select auth.uid())
        and viewer.organization_id = professional_directory.organization_id
    )
  );

revoke all on public.professional_directory from public, anon, authenticated;
grant select on public.professional_directory to authenticated;

create or replace function private.sync_professional_directory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.open_to_professional_requests
     and nullif(btrim(new.occupation), '') is not null
  then
    insert into public.professional_directory (
      profile_id, organization_id, first_name, last_name, occupation,
      professional_bio, updated_at
    ) values (
      new.id, new.organization_id, new.first_name, new.last_name,
      btrim(new.occupation), new.professional_bio, now()
    )
    on conflict (profile_id) do update set
      organization_id = excluded.organization_id,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      occupation = excluded.occupation,
      professional_bio = excluded.professional_bio,
      updated_at = now();
  else
    delete from public.professional_directory where profile_id = new.id;
  end if;

  return new;
end;
$$;
revoke all on function private.sync_professional_directory() from public, anon, authenticated;

drop trigger if exists profiles_sync_professional_directory on public.profiles;
create trigger profiles_sync_professional_directory
  after insert or update of first_name, last_name, organization_id, occupation,
    professional_bio, open_to_professional_requests
  on public.profiles
  for each row execute function private.sync_professional_directory();

insert into public.professional_directory (
  profile_id, organization_id, first_name, last_name, occupation,
  professional_bio, updated_at
)
select id, organization_id, first_name, last_name, btrim(occupation),
  professional_bio, now()
from public.profiles
where open_to_professional_requests
  and nullif(btrim(occupation), '') is not null
on conflict (profile_id) do update set
  organization_id = excluded.organization_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  occupation = excluded.occupation,
  professional_bio = excluded.professional_bio,
  updated_at = now();

-- A help request may only target an opted-in professional in the same
-- organization, and its identity columns cannot be rewritten afterward.
drop policy if exists "professional_help_requests create" on public.professional_help_requests;
create policy "professional_help_requests create"
  on public.professional_help_requests
  for insert to authenticated
  with check (
    requester_profile_id = public.current_profile_id()
    and exists (
      select 1
      from public.professional_directory target
      where target.profile_id = target_profile_id
        and target.organization_id = professional_help_requests.organization_id
    )
    and exists (
      select 1
      from public.profiles requester
      where requester.id = public.current_profile_id()
        and requester.organization_id = professional_help_requests.organization_id
    )
  );

create or replace function private.protect_professional_help_request_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.requester_profile_id is distinct from old.requester_profile_id
     or new.target_profile_id is distinct from old.target_profile_id
     or new.message is distinct from old.message
  then
    raise exception 'Request identity and message cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_professional_help_request_identity() from public, anon, authenticated;

drop trigger if exists professional_help_requests_protect_identity on public.professional_help_requests;
create trigger professional_help_requests_protect_identity
  before update on public.professional_help_requests
  for each row execute function private.protect_professional_help_request_identity();

-- Workspace-only permission for deacons, deaconesses and elders. It opens
-- the pastoral workspace without granting blanket access to private care
-- records; assigned counsel requests remain governed by their own RLS.
insert into public.permissions (code, description) values
  ('pastoral_workspace.access', 'Access the pastoral-team workspace and assigned requests')
on conflict (code) do update set description = excluded.description;

insert into public.roles (organization_id, code, name)
select id, 'pastoral_care_team', 'Pastoral Care Team'
from public.organizations
where slug = 'bull-bay'
on conflict (organization_id, code) do update set name = excluded.name;

insert into public.role_permissions (role_id, permission_code)
select r.id, 'pastoral_workspace.access'
from public.roles r
where r.code in ('pastoral_care_team', 'pastor', 'super_admin')
on conflict do nothing;

insert into public.roles (organization_id, code, name)
select id, 'church_executive', 'Church Executive'
from public.organizations
where slug = 'bull-bay'
on conflict (organization_id, code) do update set name = excluded.name;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'church_executive'
  and p.code in ('attendance.manage', 'events.manage', 'reports.read')
on conflict do nothing;

-- Starter office templates remain fully editable; ON CONFLICT DO NOTHING
-- preserves any copy the secretary team has already customized.
insert into public.document_templates (
  organization_id, slug, name, description, category, body
)
select o.id, seed.slug::citext, seed.name, seed.description, seed.category, seed.body
from public.organizations o
cross join (values
  (
    'membership-confirmation',
    'Membership Confirmation Letter',
    'Confirms active membership or attendance at NTCOG Bull Bay.',
    'Membership',
    E'To whom it may concern,\n\nThis letter confirms that {{member_name}} is a member of {{church_name}}. {{member_name}} has been connected with our congregation since {{membership_since}}.\n\nThis letter is issued at the member\'s request for the following purpose: {{purpose}}.\n\nYours in Christian service,'
  ),
  (
    'character-reference',
    'Pastoral Character Reference',
    'A formal character reference prepared by the pastor\'s office.',
    'Reference',
    E'To whom it may concern,\n\nI am pleased to provide this pastoral reference for {{member_name}}, who is known to the congregation of {{church_name}}.\n\nPurpose of this reference: {{purpose}}.\n\nPlease contact the church office using the details on this letter if further confirmation is required.\n\nYours in Christian service,'
  ),
  (
    'document-certification',
    'Document Certification / JP Request',
    'Request a document review, certified copy, signature, or JP service.',
    'Certification',
    E'This is to certify that the document presented by {{member_name}} was reviewed by the authorized office of {{church_name}} for the stated purpose: {{purpose}}.\n\nAny certification is valid only when the completed PDF bears the authorized signature, church stamp, document number, and issue date.'
  ),
  (
    'general-office-letter',
    'General Pastor\'s Office Letter',
    'A flexible official letter for requests not covered by another template.',
    'General',
    E'To whom it may concern,\n\nThis letter is issued by {{church_name}} on behalf of {{member_name}} for the following purpose: {{purpose}}.\n\nAdditional approved details will be included by the pastor\'s office before certification.\n\nYours in Christian service,'
  )
) as seed(slug, name, description, category, body)
where o.slug = 'bull-bay'
on conflict (organization_id, slug) do nothing;

-- Connect the public service schedule to the attendance workflow from day
-- one. These mirror the times already seeded on the primary campus.
insert into public.service_schedules (
  organization_id, label, day_of_week, service_time, is_active, sort_order
)
select o.id, seed.label, seed.day_of_week, seed.service_time, true, seed.sort_order
from public.organizations o
cross join (values
  ('Sunday Worship Service', 0::smallint, '09:50'::time, 10),
  ('Prayer & Fasting', 3::smallint, '09:00'::time, 20),
  ('Teens Fellowship', 5::smallint, '16:30'::time, 30)
) as seed(label, day_of_week, service_time, sort_order)
where o.slug = 'bull-bay'
  and not exists (
    select 1
    from public.service_schedules existing
    where existing.organization_id = o.id
      and existing.label = seed.label
      and existing.day_of_week = seed.day_of_week
      and existing.service_time = seed.service_time
  );

-- Explicit Data API grants for projects using the new opt-in exposure
-- defaults. RLS remains the row-authorization boundary.
grant select on public.document_templates to authenticated;
grant select on public.service_schedules to authenticated;
grant select, insert, update on public.professional_help_requests to authenticated;
