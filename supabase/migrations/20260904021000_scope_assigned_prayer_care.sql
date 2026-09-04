-- Let an assigned deacon, elder, or pastoral-care team member see and move
-- only their own prayer requests through the care workflow. Assignment and
-- the request's confidential content remain under care.manage control.

drop policy if exists "prayer_requests assigned team read" on public.prayer_requests;
create policy "prayer_requests assigned team read"
  on public.prayer_requests
  for select to authenticated
  using (
    assigned_to = (select auth.uid())
    and exists (
      select 1
      from public.pastoral_team_members team_member
      join public.profiles team_profile
        on team_profile.id = team_member.profile_id
      where team_profile.auth_user_id = (select auth.uid())
        and team_profile.organization_id = prayer_requests.organization_id
        and team_member.organization_id = prayer_requests.organization_id
        and team_member.is_active
    )
  );

drop policy if exists "prayer_requests assigned team update" on public.prayer_requests;
create policy "prayer_requests assigned team update"
  on public.prayer_requests
  for update to authenticated
  using (
    assigned_to = (select auth.uid())
    and exists (
      select 1
      from public.pastoral_team_members team_member
      join public.profiles team_profile
        on team_profile.id = team_member.profile_id
      where team_profile.auth_user_id = (select auth.uid())
        and team_profile.organization_id = prayer_requests.organization_id
        and team_member.organization_id = prayer_requests.organization_id
        and team_member.is_active
    )
  )
  with check (
    assigned_to = (select auth.uid())
    and exists (
      select 1
      from public.pastoral_team_members team_member
      join public.profiles team_profile
        on team_profile.id = team_member.profile_id
      where team_profile.auth_user_id = (select auth.uid())
        and team_profile.organization_id = prayer_requests.organization_id
        and team_member.organization_id = prayer_requests.organization_id
        and team_member.is_active
    )
  );

create or replace function private.enforce_assigned_prayer_status_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Service-role jobs and care managers keep their existing full workflow.
  if (select auth.uid()) is null
     or public.has_permission(old.organization_id, 'care.manage')
  then
    return new;
  end if;

  if old.assigned_to = (select auth.uid())
     and exists (
       select 1
       from public.pastoral_team_members team_member
       join public.profiles team_profile
         on team_profile.id = team_member.profile_id
       where team_profile.auth_user_id = (select auth.uid())
         and team_profile.organization_id = old.organization_id
         and team_member.organization_id = old.organization_id
         and team_member.is_active
     )
     and (
       to_jsonb(new) - array['status', 'updated_at']::text[]
     ) is distinct from (
       to_jsonb(old) - array['status', 'updated_at']::text[]
     )
  then
    raise exception 'Assigned team members may only change prayer-request status'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_assigned_prayer_status_only()
  from public, anon, authenticated;

drop trigger if exists prayer_requests_enforce_assigned_status_only
  on public.prayer_requests;
create trigger prayer_requests_enforce_assigned_status_only
  before update on public.prayer_requests
  for each row execute function private.enforce_assigned_prayer_status_only();

-- The current app uses the REST/Data API for these authenticated operations.
grant select, update on public.prayer_requests to authenticated;
