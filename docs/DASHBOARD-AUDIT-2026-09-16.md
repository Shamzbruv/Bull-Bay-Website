# Dashboard audit — 16 September 2026

## Findings and repairs

- **Profile saves:** production lacks `profiles.share_profile_with_group_leaders`, although the form sent it on every save. The older self-service trigger also excludes that field. The profile action now supports the deployed schema; the unavailable preference is disabled and explained instead of breaking all edits. The database migration adds the column, consent-gated group-leader access, and the self-service allowlist entry.
- **Volunteers:** the page selected `volunteer_assignments.id`, but the table uses `(shift_id, profile_id)` as its key. The count now uses `profile_id`.
- **My Ministry:** an authenticated read reproduced `42P17` (the teammate policy queries its own table recursively). The private helper migration removes that recursion. Member reads are additionally restricted on the server to the signed-in member and church. Office roster operations require `ministry_assignments.manage`; leader operations verify the specific ministry's leader. Server-side roster operations retain explicit actor audit entries and organization boundaries. Unlinking an assignment now preserves a display name, satisfying the table's identity constraint.
- **Staff member home:** middleware redirected staff away from `/member` despite their navigation linking there. Their own member home now opens inside their assigned workspace.
- **Document alerts:** two live approval notifications from September 15 have matching creation audit records, but neither document still exists. The records available do not establish why they were removed. New alerts link to a specific request; the pastor screen explains unavailable or no-longer-pending requests. Database failures no longer masquerade as empty document lists.
- **Other tabs:** 47 dashboard pages now propagate query failures to the existing retry/error boundary instead of rendering false empty lists. Preference saves do not reset push settings. Profile photo replacement keeps the old file until its replacement is saved; household/photo operations check save failures.
- **Phone notifications:** production had no Web Push configuration, worker configuration, or subscriptions. Encrypted VAPID keys are now configured. Railway starts the durable notification/email/calendar worker once per server process, with the existing database claim coordinating instances. A browser subscription is only shown as connected if it is also registered to the signed-in account on the server. The UI includes phone setup instructions and a device-specific test delivery button. Failed subscription lookups leave notifications pending for retry.

## Verification

- Node 22 production build, TypeScript, ESLint, and 13 regression tests.
- `node --env-file=.env.local scripts/audit-dashboard-schema.mjs` passed 226 literal dashboard read/mutation-column checks across 59 page files using zero-row queries. This checks schema compatibility, not every possible permission or business workflow.
- A temporary member reproduced the original missing-column error; ordinary profile updates and notification preferences succeeded and protected membership changes were rejected. The account was removed.
- Signed-in browser testing confirmed profile changes persisted, the push enable control was available, and a missing-document alert explained its status. Member, Pastor, Executive Assistant and Church Administrator pages, plus Finance Officer and Store Manager giving/shop access, were exercised, including the previously broken ministry and volunteer tabs. Access-denied screens were expected where the fixture role lacked permission. Temporary audit accounts were removed after each run; no real member profiles were edited. These are page-load and targeted workflow checks, not an exhaustive test of every form, every role or external delivery provider.
- The Railway-style background worker was started locally against the production database; its database heartbeat advanced. No email deliveries, calendar connections, or push subscriptions existed at setup time. Actual phone reception still requires a person to grant permission on that phone.

## Database work awaiting restored access

The supplied Management API token returned HTTP 401, and the Supabase connector denied SQL execution. The server's existing service key permitted scoped data verification, but it cannot apply DDL.

Apply and verify these reviewed migrations after database access is restored:

1. `supabase/migrations/20260916104930_fix_profile_privacy_self_service.sql`
2. `supabase/migrations/20260916110542_fix_ministry_teammate_policy_recursion.sql`

Do not replay the whole migration directory blindly; this project's historical migration baseline needs reconciliation (see `LAUNCH-VERIFICATION.md`). Until the first migration is applied, the group-sharing preference remains unavailable; ordinary profile editing continues to work. The underlying direct authenticated ministry-table policy still needs the second migration even though the application uses authorized server queries.

## Phone connection

- iPhone/iPad: Safari → Share → Add to Home Screen; open the installed church app, sign in, then Phone & notifications → Enable notifications on this device. iOS/iPadOS 16.4 or later is required.
- Android: open the site in Chrome, sign in, enable notifications on the same page, and accept the permission prompt.
- Use **Send a test notification**. If the phone stays quiet, check notification permissions and Focus/Do Not Disturb settings. Permission is per device/browser.
- Google Calendar OAuth is a separate integration and still needs the church's Google client ID and secret; this audit does not claim that external account connection was completed.
