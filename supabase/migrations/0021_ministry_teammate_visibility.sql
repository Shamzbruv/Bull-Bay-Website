-- A member who has been staff-linked (profile_id set, not just display_name)
-- to an active assignment in a ministry may see their fellow active
-- teammates in that same ministry — this is the "member-visible
-- ministry/department roster" the member portal spec calls for. It is
-- still never public, and still requires the profile_id link a staff
-- member deliberately made — an unlinked (display_name-only) row grants no
-- visibility to anyone but staff.
create policy "ministry_assignments teammate read" on public.ministry_assignments
  for select to authenticated
  using (
    is_active and exists (
      select 1 from public.ministry_assignments mine
      where mine.ministry_id = ministry_assignments.ministry_id
        and mine.profile_id = public.current_profile_id()
        and mine.is_active
    )
  );
