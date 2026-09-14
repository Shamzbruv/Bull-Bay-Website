-- No member should see another member's personal details (phone,
-- address, date of birth, emergency contact, ...) unless that person has
-- chosen to share them, or the viewer is staff who genuinely needs it
-- (admin/church_admin, pastor, pastoral team, secretary — all governed
-- separately by the "profiles staff read" policy via people.read).
--
-- "profiles group leader read" was the one gap: being a group
-- "leader"/"co_leader" is a lightweight, per-group designation any member
-- can hold (set in group_members.role, unrelated to organization-wide
-- staff roles) — the policy let that person read a member's *entire*
-- profile row with no opt-in at all. It's now gated on the member's own
-- choice, off by default.
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

-- "Pastoral team" (deacons, deaconesses, elders — public.pastoral_care_team,
-- distinct from the top-level pastor role) was only ever granted
-- pastoral_workspace.access, not people.read — so they couldn't actually
-- see member records at all, despite being one of the groups explicitly
-- meant to for pastoral care purposes.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'people.read' from public.roles r where r.code = 'pastoral_care_team'
on conflict do nothing;
