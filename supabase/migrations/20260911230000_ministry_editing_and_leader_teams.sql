-- Pastoral team gets the same public-content access the secretary team
-- already has, so ministries (names, descriptions, icons on
-- /ministries) can be kept current by either team.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'content.manage' from public.roles r where r.code = 'pastor'
on conflict do nothing;

-- A ministry's own leader (ministries.leader_profile_id) manages that one
-- ministry's "Learn more" description and its team roster, without
-- needing the org-wide content.manage / ministry_assignments.manage
-- staff permissions. Scoped to their own row only — read + update, never
-- insert/delete, so a leader can't create or remove ministries.
--
-- Column-level trust boundary, not RLS: the leader-facing server action
-- only ever writes the description column for this policy's rows —
-- name/slug/icon/leader_profile_id changes only ever come from the
-- staff-only content.manage editor. RLS itself can't restrict which
-- columns an authorized row-update touches.
create policy "ministries leader read" on public.ministries
  for select to authenticated using (leader_profile_id = public.current_profile_id());
create policy "ministries leader update" on public.ministries
  for update to authenticated
  using (leader_profile_id = public.current_profile_id())
  with check (leader_profile_id = public.current_profile_id());

create policy "ministry_assignments leader manage" on public.ministry_assignments
  for all to authenticated
  using (exists (
    select 1 from public.ministries m
    where m.id = ministry_assignments.ministry_id and m.leader_profile_id = public.current_profile_id()
  ))
  with check (exists (
    select 1 from public.ministries m
    where m.id = ministry_assignments.ministry_id and m.leader_profile_id = public.current_profile_id()
  ));
