-- Repair the missing privacy column and permit members to update their own consent.
alter table public.profiles
  add column if not exists share_profile_with_group_leaders boolean not null default false;

drop policy if exists "profiles group leader read" on public.profiles;
create policy "profiles group leader read" on public.profiles
  for select to authenticated
  using (
    share_profile_with_group_leaders
    and exists (
      select 1
      from public.group_members gm
      where gm.profile_id = profiles.id
        and public.is_group_leader(gm.group_id)
    )
  );


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
         'share_profile_with_group_leaders', 'updated_at'
       ]::text[]
     ) is distinct from (
       to_jsonb(old) - array[
         'first_name', 'last_name', 'phone', 'date_of_birth', 'gender',
         'preferred_contact_method', 'communication_email_opt_in',
         'communication_sms_opt_in', 'avatar_path', 'household_id',
         'job_title', 'employer', 'marital_status', 'address_line1', 'city',
         'parish', 'emergency_contact_name', 'emergency_contact_phone',
         'occupation', 'professional_bio', 'open_to_professional_requests',
         'share_profile_with_group_leaders', 'updated_at'
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

