# Data Model

The schema lives in `supabase/migrations/*.sql`, applied in order. This
document explains the shape and the rules that keep it consistent — read
the migrations themselves for exact columns.

## Core rule: auth identity ≠ church identity

`profiles.auth_user_id` is a **nullable** foreign key to `auth.users.id`.
A person can exist in the church database (added by staff, or via a
`contact_submissions` follow-up) before ever creating a login. When someone
signs in for the first time, `handle_new_auth_user()` (a trigger on
`auth.users`) either links their new auth account to an existing profile
with a matching email, or creates a fresh one. Never join on
`profiles.id = auth.uid()` — always go through `auth_user_id`, or use the
`current_profile_id()` SQL helper.

## Domains

| Migration | Domain | Key tables |
|---|---|---|
| `0001` | Core identity | `organizations`, `campuses`, `profiles`, `households`, `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_logs` |
| `0002` | Content & engagement | `pages`, `sermon_series`, `sermons`, `events`, `event_registrations`, `ministries`, `groups`, `group_members`, `announcements` |
| `0003` | Pastoral care | `prayer_requests`, `care_cases`, `care_case_access` |
| `0004` | Giving | `funds`, `donations`, `donation_allocations` |
| `0005` | Commerce | `products`, `product_variants`, `inventory_movements`, `orders`, `order_items`, `payments`, `refunds`, `digital_entitlements`, `webhook_events` |
| `0006` | Volunteers & support | `volunteer_opportunities`, `volunteer_shifts`, `volunteer_assignments`, `notification_preferences` |
| `0007` | RLS policies | (policies on every table above) |
| `0008` | Seed: roles/permissions | reference data |
| `0009` | Seed: content | real launch content (sermons/events/ministries/funds/products) |
| `0010` | Storage buckets | `storage.buckets` rows + `storage.objects` policies |
| `0011` | Contact submissions | `contact_submissions` |
| `0012` | Order number default | (fixes `orders.order_number` to a column default) |

Single-organization today: `0008` seeds exactly one `organizations` row and
one `campuses` row. The schema is multi-campus-shaped (every content table
carries `organization_id`, most carry `campus_id`) so a second congregation
can join later without a redesign — see the blueprint PDFs for why.

## Money

Every amount is an **integer minor unit** column (`*_minor`), e.g. JMD
$3,500.00 is stored as `350000`. Never use floating point for money. Use
`lib/money.ts#formatJmd` / `parseJmdToMinorUnits` — don't hand-roll
formatting elsewhere. Order/donation line items snapshot the price at time
of transaction (`order_items.unit_price_minor`, not a live join to
`products.price_minor`) so a later price change never rewrites history.

## Inventory

`inventory_movements` is an append-only ledger, not a mutable stock count.
Available stock is `sum(quantity_delta)` per variant, exposed as the
`variant_stock_levels` view. Reasons: `initial_stock`, `order`, `return`,
`adjustment`, `restock`. (Note: this view has no declared foreign key to
`product_variants`, so PostgREST can't auto-embed it in a nested `select()`
— fetch it separately and merge, as `lib/data/public.ts#getProductBySlug`
does.)

## Permissions, not roles, gate access

RLS policies call `public.has_permission(organization_id, 'code')`, never a
role name directly. `role_permissions` maps roles to permission codes;
`user_roles` grants a role (optionally scoped to a `campus_id`) to an
`auth.users.id`. See `SECURITY.md` for the full permission catalogue and
`0008_seed_roles_permissions.sql` for the starting role → permission map.
Group/ministry leader access is the one exception — it's checked directly
against `group_members.role IN ('leader','co_leader')` in RLS rather than
through the permission system, because that access is inherently
per-group, not organization-wide.

## Regenerating TypeScript types

`lib/supabase/types.ts` is generated, not hand-written. After any schema
change, regenerate it via the Supabase Management API
(`GET /v1/projects/{ref}/types/typescript?included_schemas=public,storage`)
or `supabase gen types typescript` once the CLI is linked interactively.
