/**
 * "Request to join the church" rides on the existing contact_submissions
 * table rather than the dedicated kind/status values it was originally
 * designed with (kind='membership_request', status='approved'/'declined').
 * Those values need a migration this environment currently has no way to
 * apply to the live database, so this reuses values that have always been
 * valid: kind='connection_card' (identified instead by this fixed
 * `interest` marker) and status stays within 'new' / 'in_progress' /
 * 'closed'. Approved-vs-declined is told apart by whether assigned_to got
 * set (approve sets it to the approving staff member; decline leaves it
 * null) — both just end at status='closed'.
 *
 * If the pending migration (20260904040000_membership_requests.sql) is
 * ever applied, none of this needs to change — it still works exactly the
 * same way, just without the nicer dedicated column values.
 */
export const MEMBERSHIP_REQUEST_MARKER = "Membership request";

export function isMembershipRequest(interest: string | null | undefined): boolean {
  return interest === MEMBERSHIP_REQUEST_MARKER;
}
