-- Office-only notes are stored on requests, but requester SELECT policies
-- previously exposed every column through the Data API. No current page
-- reads staff_notes; privileged office exports can read it server-side.
revoke select on public.counsel_requests from authenticated, anon;
grant select(id,organization_id,requester_profile_id,requested_with_profile_id,
  reason,details,is_urgent,preferred_date,preferred_time,status,
  scheduled_event_id,created_at,updated_at) on public.counsel_requests to authenticated;
