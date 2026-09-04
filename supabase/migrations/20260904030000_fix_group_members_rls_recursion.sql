-- Fixes a live, user-facing bug: loading a profile (i.e. every authenticated
-- page load) was failing with "infinite recursion detected in policy for
-- relation group_members", which cascaded into every dashboard query that
-- fell back to an empty-string organization_id and failed a second time
-- with "invalid input syntax for type uuid".
--
-- Root cause: "group_members own read" filters on whether the current
-- profile leads the group via a subquery against group_members itself
-- (`... group_id IN (select ... from group_members leader where ...)`).
-- A policy whose predicate re-queries its own table forces Postgres to
-- re-apply that same policy to the inner rows, which re-runs the same
-- subquery, and so on — genuine unbounded recursion, which is exactly
-- what "profiles group leader read" then triggers every time it checks
-- group_members while loading a profile.
--
-- Fix: move the "is this profile a leader/co-leader of this group" check
-- into a SECURITY DEFINER function, the same pattern current_profile_id()
-- and has_permission() already use — its internal query bypasses RLS
-- entirely, so it can safely read group_members without re-triggering
-- group_members' own policies.
create or replace function public.is_group_leader(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members leader
    where leader.group_id = target_group_id
      and leader.profile_id = public.current_profile_id()
      and leader.role = any(array['leader', 'co_leader'])
  );
$$;

revoke all on function public.is_group_leader(uuid) from public, anon;
grant execute on function public.is_group_leader(uuid) to authenticated;

drop policy if exists "group_members own read" on public.group_members;
create policy "group_members own read" on public.group_members
  for select to authenticated
  using (
    profile_id = public.current_profile_id()
    or public.has_permission((select g.organization_id from public.groups g where g.id = group_members.group_id), 'groups.manage')
    or public.is_group_leader(group_id)
  );

drop policy if exists "profiles group leader read" on public.profiles;
create policy "profiles group leader read" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.profile_id = profiles.id
        and public.is_group_leader(gm.group_id)
    )
  );
