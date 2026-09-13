# Role and calendar release — 13 September 2026

This release fixes role assignment, invitations, dashboard routing, pastoral booking, and calendar subscriptions.

- The founding super administrator is pinned to the Auth user originally registered as `shamzbiz1@gmail.com`. Changing a profile email cannot transfer this protection. No super administrator can change their own role. Only an existing super administrator can assign another person's role.
- Role assignment is a single database transaction that replaces previous grants, writes an audit entry, and provisions/deactivates the pastoral calendar as needed. Direct authenticated writes to the role catalogue, permission mappings and user grants are revoked.
- All 12 configured staff roles and Member appear in the super-administrator preview selector. Preview changes navigation, permission-gated tools and dashboard summaries; it does not impersonate another person's identity or RLS session. Mutation requests are blocked until the administrator exits preview.
- Ordinary users enter their assigned workspace after sign-in and invitation password setup. Shared account screens retain that workspace's shell. Pastor-authorized office tools remain accessible within the pastor shell.
- Invitation emails identify the assigned role. Staff password recovery sends a link to the Auth account's registered email and never reveals a temporary password to staff.
- Pastor and pastoral-care role assignment creates an active pastoral-team record. Working hours must be entered by the pastoral team; this release does not invent the pastor's schedule.
- Members select 30-minute times within published availability. Private events and days off remove times from the slot list without exposing their details. Requests remain pending until confirmed. A database exclusion constraint prevents overlapping appointments, including concurrent writes. Confirmation and cancellation update the request and calendar in one transaction and create notifications.
- Personal subscription feeds include confirmed meetings and pastoral calendar entries. Every workspace links to personal and church-event subscriptions. Google/Apple/phone subscriptions are **one-way**: clients refresh on their own schedule, and changes made in external calendars are not imported as church availability. This is not Google OAuth or two-way synchronization.

## Database reconciliation

The live project had partially applied SQL files and no `supabase_migrations.schema_migrations` table. The following repository migrations were reconciled and applied using the Management API in one transaction with the new release migration:

- `20260904003958_harden_profiles_and_seed_operations.sql` (corrected invalid string quoting before execution)
- `20260904021000_scope_assigned_prayer_care.sql`
- `20260904030000_fix_group_members_rls_recursion.sql`
- `20260904040000_membership_requests.sql`
- `20260904050000_fix_care_cases_rls_recursion.sql`
- `20260911220000_secretary_manages_direction.sql`
- `20260911230000_ministry_editing_and_leader_teams.sql`
- `20260911240000_notifications.sql`
- `20260913131720_launch_roles_and_calendar_integrity.sql`

A follow-up migration, `20260913183441_protect_counsel_staff_notes.sql`, restricts requester-visible request columns so office-only notes cannot be read through the Data API. Scheduling/status RPCs retain their authorized access.

The shop/video migration was already present and was not replayed. The unrelated faith-content migration was not part of this release. Do not run an unreviewed `supabase db push` against this project: establish a verified migration-history baseline first.

## Verification

- `npm test`: role routing, redirect validation, invitation rendering, calendar escaping/folding/time conversion, and signed feed token validation.
- `npm run typecheck`, `npm run lint`, `npm run build` (Node 22).
- `tests/roles-and-calendars.sql`: real database permissions, owner/self-role locks, replacement semantics, pastoral provisioning, private availability, forbidden scheduling, exclusion constraints, cancellation, notification creation and revocation. Fixtures run in a rolled-back transaction.
- Browser tests passed for Member, Pastor, Secretary, Church Administrator and Super Administrator: assigned landing pages, denied cross-workspace access, all 13 preview options, read-only preview, owner-role lock, real invite acceptance/password setup, member booking, pastor confirmation, private calendar feed, invalid feed token and cancellation. No unhandled browser errors. Temporary Auth accounts were used without outgoing email; fixtures are removed after validation.
- Two simultaneous confirmation requests were tested against the live database; exactly one could book the time.
- Resend domain-status verification was unavailable to the configured sending key (HTTP 403); actual outbound delivery was not tested. Invitation content and the Supabase acceptance flow were tested independently.

Supabase's security advisor was run before and after the migration. The unsafe professional-directory view, mutable function search paths and callable trigger helpers were fixed. Remaining notices include existing public-schema extensions, intentional RLS helper RPCs, optional leaked-password protection, and the legacy `variant_stock_levels` aggregate view (intentionally used for public shop stock totals). That stock projection is outside this role/calendar change and remains an advisor error requiring a separate inventory access-model review. The private owner registry and webhook inbox intentionally have no client RLS policies.

## Operational setup

The pastor must publish real available days/hours under **My calendar** before members can request times. Anyone with a personal subscription URL can read that feed; keep it private. `CALENDAR_FEED_SECRET` may be set to a dedicated signing key; otherwise the existing server-only service key signs feeds. Changing the signing key invalidates existing subscription URLs.

The registered production origin is `https://bullbayntcog.org`, hosted through the repository's existing Railway deployment. Production must retain the configured Supabase keys, Resend sender/API key and `NEXT_PUBLIC_SITE_URL=https://bullbayntcog.org`.
