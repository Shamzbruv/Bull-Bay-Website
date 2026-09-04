-- "Request to join the church" — a non-member submits a request from the
-- public site, and the pastor or admin staff approve it from the same
-- Visitors screen that already handles connection cards and contact
-- messages (both already gated on people.write). Approving a request
-- provisions a real login for the applicant (see lib/members/invite.ts),
-- exactly like inviting a member by hand, so nothing about this feature
-- is a dead end that just relabels a status.
--
-- NOT REQUIRED for the feature to work: the app code was later changed
-- (see lib/members/membership-request.ts) to store these under the
-- already-valid kind='connection_card' + a fixed `interest` marker
-- instead of the dedicated values below, once it became clear this
-- migration couldn't be applied to the live database promptly and
-- people were actually blocked from joining. Applying this migration is
-- still worthwhile for the pastor people.write grant and for schema
-- clarity, but /join already works without it.

alter table public.contact_submissions
  drop constraint contact_submissions_kind_check;
alter table public.contact_submissions
  add constraint contact_submissions_kind_check
  check (kind in ('contact', 'connection_card', 'membership_request'));

alter table public.contact_submissions
  drop constraint contact_submissions_status_check;
alter table public.contact_submissions
  add constraint contact_submissions_status_check
  check (status in ('new', 'in_progress', 'closed', 'approved', 'declined'));

-- The pastor already reviews people pastorally (people.read); grant
-- people.write too so the Visitors screen — and its new Approve/Decline
-- actions on membership requests — is visible to the pastor, not only
-- church_admin/super_admin.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'people.write'
from public.roles r
where r.code = 'pastor'
on conflict do nothing;
