# Member records and event registration

## Staff workflows

Church secretaries, Executive Assistants, and church administrators can maintain the People directory, view every assigned church role, and read event registrations. Role assignment remains restricted to the Super Administrator.

Open a person's record to edit their membership date, membership information, deceased status, optional date of death, and existing contact information. Office categories support reusable category names, named details, corrections, and individual deletion. These details are visible only to staff with `people.read`, including in the confidential member PDF; they are not exposed through the member's self-service profile.

People can be added without a login or email address. Creating a directory record does not send an invitation or create an authentication account. Use the existing invitation workflow when an account is wanted.

Record and detail edits reject stale versions rather than overwrite another staff member's changes. Successful actions invalidate dashboard caches so subsequent views use the saved data.

Deleting a person requires `people.delete` and typing DELETE. Their custom details are removed, linked sessions and refresh tokens are revoked, and the authentication account is banned. Historical event registrations and church transactions remain. The caller's own account and accounts with any role other than Member are protected. No existing member records are removed by this migration.

## Event registration

Registrants must declare whether they are church members. Members are directed to sign in and returned to the event; visitors can register without an account. Both provide their full name, email, phone, group size, one name per additional attendee, any special requirements, notes, and permission to share the details with the church office. Contact answers are snapshots, so an event's submitted details do not change when a member later edits their profile.

The database serializes submissions per event, checks publication/visibility, registration opening and closing times, event start, available capacity, church profile ownership scope, and deceased status. Duplicate active registrations by profile or contact email return an already-registered message. Cancelled registrations can be submitted again. Anonymous and authenticated clients cannot insert directly through the Data API; the server uses a restricted service-only function after form validation and authentication checks.

The registration and in-app staff notifications are committed together. Supplementary office email is attempted after the commit, and a mail outage cannot discard the registration. The events screen links to the staff detail view and a confidential CSV download. Exports escape spreadsheet formulas.

## Conference document

The member portal and administrative screen download the latest PDF or PowerPoint uploaded to `member-resources/conference`, with an attachment filename and a five-minute signed URL. Uploads preserve the correct extension and content type and reject empty, unsupported, or oversized files. Download authorization requires a church-linked account in the current organization.

## Deployment order

The conference download change can deploy against the existing schema.

The remaining changes require `supabase/migrations/20261013181333_member_records_event_registration.sql` **before** their application code is deployed. The migration is transactional and adds profile fields, the staff-only details table and policies, secretary permissions, event snapshots, the registration transaction, and a correction to ordinary Member account deletion. It does not delete any records.

1. Connect the Supabase account with access to the Bull Bay project `gfbeauuvicewxtuuvndf`. The currently connected account exposes only Grace_Connect and ICSS Ledger and denies access to Bull Bay.
2. Inspect the live schema and apply the migration using the project's normal migration workflow.
3. Verify the new columns/table/function and security advisors in the actual project. Test with a secretary, a member, and a visitor; confirm staff notifications and conference download.
4. Merge the member/event branch to main for Railway deployment, then smoke-test the same workflows in production.

## Validation

`npm run typecheck`, `npm run lint`, and `npm test` pass (171 tests). The new tests execute the migration against isolated PostgreSQL via PGlite and verify permissions, tenant boundaries, duplicate submissions, capacity, registration windows, staff visibility, member sign-in, deceased records, transactional notifications, protected accounts, and deletion behavior. This is not a substitute for checking the live project's schema and policies.

The production build passes with placeholder Supabase credentials and Next's Google Fonts test responses. A direct build in this environment failed while fetching Google Fonts; no production font behavior was changed.

Browser interaction checks could not run locally because the Chromium download returned an invalid archive. Live browser and email-delivery checks remain part of deployment verification.
