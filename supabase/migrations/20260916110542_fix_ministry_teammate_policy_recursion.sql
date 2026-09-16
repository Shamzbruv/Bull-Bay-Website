-- The previous policy queried its own RLS-protected table recursively.
-- This private helper can answer only whether the caller has an active
-- assignment; it exposes neither another member's identity nor roster data.
create or replace function private.is_ministry_teammate(target_ministry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.ministry_assignments a
    join public.profiles p on p.id = a.profile_id
    where a.ministry_id = target_ministry and a.is_active
      and p.auth_user_id = (select auth.uid())
      and p.organization_id = a.organization_id
  );
$$;
revoke all on function private.is_ministry_teammate(uuid) from public, anon;
grant execute on function private.is_ministry_teammate(uuid) to authenticated;
drop policy if exists "ministry_assignments teammate read" on public.ministry_assignments;
create policy "ministry_assignments teammate read" on public.ministry_assignments
  for select to authenticated
  using (is_active and private.is_ministry_teammate(ministry_id));
