# Security & Privacy

## Row Level Security

Every table in `public` has RLS enabled (`supabase/migrations/0007_rls_policies.sql`,
plus `0011` for `contact_submissions`). There is no exposed table without a
policy deciding who can read/write it. `webhook_events`, `payments`, and
`refunds` intentionally have no `authenticated`/`anon` write policy at all —
only the service-role key (used server-side only) can touch them, matching
the webhook-first design in `ARCHITECTURE.md`.

Verified via the Management API at build time (re-run these after any
schema change):

```sql
select count(*) filter (where rowsecurity) as rls_enabled, count(*) as total
from pg_tables where schemaname = 'public';
-- anon spot-checks (should return 0 rows for the sensitive ones):
set role anon; select count(*) from public.profiles;      -- 0
set role anon; select count(*) from public.donations;     -- 0
set role anon; select count(*) from public.care_cases;    -- 0
set role anon; select count(*) from public.sermons;       -- published only
reset role;
```

## Permission model

Roles never gate access directly — every policy calls
`public.has_permission(organization_id, 'permission.code')`. The catalogue
(seeded in `0008_seed_roles_permissions.sql`):

`people.read` `people.write` `events.manage` `groups.manage`
`volunteers.manage` `sermons.manage` `content.manage`
`communications.send` `giving.read` `giving.manage` `shop.manage`
`refunds.approve` `reports.read` `care.read` `care.manage` `roles.manage`
`sites.manage` `integrations.manage`

Starting roles: `super_admin` (all permissions — keep this to as few
accounts as possible), `church_admin`, `pastor`, `finance_officer`,
`content_editor`, `store_manager`, `volunteer_coordinator`, `group_leader`
(no global permissions — access comes from `group_members.role`, scoped to
their own group).

Deliberate separation of duties, per the blueprint: `church_admin` does
**not** get `giving.*` or `care.*`. `pastor` gets `care.*` but not
`shop.manage` or `giving.*`. A content editor can publish a sermon without
ever being able to read a donation record.

## Authentication & MFA

Members: Supabase Auth email OTP/magic-link (`/login`), no password. Staff:
**invitation-only** (`/admin/roles` → `inviteStaffMember`, using
`auth.admin.inviteUserByEmail` via the service-role client) — there is no
public staff signup path.

MFA is enforced at the route-group level, not just suggested: `(pastor)`
and `(admin)` layouts both call `getAuthenticatorAssuranceLevel()` and
redirect to `/member/security` if the session isn't AAL2. Enrollment itself
(`/member/security`) uses `supabase.auth.mfa.enroll({ factorType: "totp" })`
— any signed-in member can turn it on, but staff/pastor/admin routes
require it.

## Pastoral care confidentiality

`care_cases` is readable only by its `owner_id` or a user explicitly listed
in `care_case_access` (audited — every grant/revoke writes an
`audit_logs` row via trigger), or `care.manage`. There is no "admin can
read everything" backdoor. `prayer_requests.visibility` lets a submitter
mark a request `confidential`, `prayer_team`, or `public`.

## Storage buckets

| Bucket | Public? | Access pattern |
|---|---|---|
| `public-site` | Yes | Anyone reads; `content.manage` staff write |
| `sermon-audio` | Yes | Anyone reads; `sermons.manage` staff write |
| `member-avatars` | No | Each user reads/writes only `<their auth_user_id>/…` |
| `digital-products` | No | **No** anon/authenticated policy at all — only reachable via `/api/me/downloads/[id]/url`, which checks the entitlement server-side and issues a 5-minute signed URL |
| `pastoral-attachments` | No | No policy yet — reserved for care-team document uploads (not built this pass) |
| `receipts` | No | No policy yet — reserved for generated PDF receipts (not built this pass) |

## Secrets

`SUPABASE_SERVICE_ROLE_KEY` lives only in `.env.local` (gitignored) and is
read only inside server-only files (`lib/supabase/server.ts#createServiceRoleClient`,
route handlers). It is never assigned to a `NEXT_PUBLIC_*` variable and
never imported by a file marked `"use client"`. The Supabase **management**
token used to provision this project during setup was never written to any
file — it lived only in the provisioning session's environment and should
be regenerated from the Supabase dashboard since it was shared in chat.

## What's NOT resolved by code — church/legal action required

These are flagged, not solved, by this codebase:

- **Jamaica Data Protection Act**: data-controller registration with the
  OIC, whether a DPO is required (likely, given pastoral/prayer data),
  and an annual DPIA. Get Jamaican privacy counsel before importing real
  member data at scale.
- **Payment provider selection & merchant underwriting** (PayPal / WiPay /
  Powertranz) — see `ROADMAP.md`.
- **GCT/tax treatment** of shop sales, digital products, and donations —
  needs the church's accountant, not a hard-coded 15%.
- **Legal entity / charity registration details** for receipts and
  merchant applications.
- **WCAG 2.2 AA audit** — the components use semantic HTML, labeled
  form controls, a skip link, and visible focus by default, but a real
  audit (including with a screen reader) hasn't been done.
- **Backup strategy**: Supabase's own database backups don't cover Storage
  objects — once real digital products/attachments exist, add an external
  Storage backup and do a restore drill before relying on it.
- **Penetration test / OWASP ASVS review** before handling real financial
  or pastoral data at scale.
