-- Fixes a live, user-facing bug: opening the Pastor workspace fails with
-- "infinite recursion detected in policy for relation \"care_cases\"".
--
-- Same class of bug already fixed for group_members in
-- 20260904030000_fix_group_members_rls_recursion.sql, just across two
-- tables instead of one table referencing itself:
--   - "care_cases scoped read" checks care_case_access via a raw subquery.
--   - care_case_access's own policies check care_cases via a raw subquery
--     (to find the case's organization_id for has_permission()).
-- Each table's policy re-triggers the other table's RLS, which
-- re-triggers the first, forever.
--
-- Fix: same pattern as is_group_leader() — move both cross-table checks
-- into SECURITY DEFINER functions, whose internal queries bypass RLS.

create or replace function public.care_case_organization_id(target_case_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.organization_id from public.care_cases c where c.id = target_case_id;
$$;

revoke all on function public.care_case_organization_id(uuid) from public, anon;
grant execute on function public.care_case_organization_id(uuid) to authenticated;

create or replace function public.has_care_case_access(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_case_access cca
    where cca.case_id = target_case_id
      and cca.user_id = (select auth.uid())
  );
$$;

revoke all on function public.has_care_case_access(uuid) from public, anon;
grant execute on function public.has_care_case_access(uuid) to authenticated;

drop policy if exists "care_cases scoped read" on public.care_cases;
create policy "care_cases scoped read" on public.care_cases
  for select to authenticated using (
    owner_id = (select auth.uid())
    or public.has_care_case_access(id)
    or public.has_permission(organization_id, 'care.manage')
  );

drop policy if exists "care_case_access scoped read" on public.care_case_access;
create policy "care_case_access scoped read" on public.care_case_access
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.has_permission(public.care_case_organization_id(case_id), 'care.manage')
  );

drop policy if exists "care_case_access staff manage" on public.care_case_access;
create policy "care_case_access staff manage" on public.care_case_access
  for all to authenticated
  using (public.has_permission(public.care_case_organization_id(case_id), 'care.manage'))
  with check (public.has_permission(public.care_case_organization_id(case_id), 'care.manage'));
