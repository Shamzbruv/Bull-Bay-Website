# Architecture

Bull Bay Digital Church is a Next.js 16 (App Router, TypeScript, React Server
Components) application backed entirely by one Supabase project — Postgres,
Auth, Storage and RLS. This document is the map; see `DATA_MODEL.md` for the
schema and `SECURITY.md` for the security/privacy posture.

## Why this stack

Supabase Auth integrates directly with PostgreSQL Row Level Security, so
authorization is enforced in the database, not just hidden menu items in the
UI. Next.js gives server-rendered pages (good for SEO — see below), real
route-level access control via middleware + layouts, and Server Actions for
mutations without hand-rolled API boilerplate everywhere.

## Request flow

```
Browser
  │
  ├── Server Components (app/**/page.tsx) ─── lib/supabase/server.ts (anon key, RLS-scoped)
  ├── Client Components ────────────────────── lib/supabase/client.ts (anon key, RLS-scoped)
  ├── Server Actions (**/actions.ts) ───────── same anon-key server client, RLS-scoped
  └── Route Handlers (app/api/**) ──────────── anon-key client, OR
                                                 lib/supabase/server.ts#createServiceRoleClient()
                                                 for privileged operations (signed downloads,
                                                 staff invitations) that must bypass RLS
                                                 deliberately.
```

The service-role key is never imported into a Client Component and is never
prefixed `NEXT_PUBLIC_`. Every table it can reach still has RLS enabled —
the service role bypasses it by Postgres role, not by policy — so a bug
elsewhere in the schema can't accidentally expose data through it.

## Route groups

- `app/(public)/` — the public site. Has the full header/footer via its own
  `layout.tsx`. No auth required for any page in this group.
- `app/(auth)/` — `/login`, `/auth/callback`, `/auth/signout`. Minimal shell.
- `app/(member)/` — `/member/*`. Requires a signed-in session
  (`middleware.ts` redirects to `/login` otherwise).
- `app/(pastor)/` — `/pastor/*`. Requires `care.manage`, `care.read` or
  `sermons.manage`, **and** an AAL2 (MFA-verified) session.
- `app/(admin)/` — `/admin/*`. Requires any staff permission, **and** AAL2.
  Individual admin pages additionally check their specific permission
  (`people.read`, `events.manage`, …) and render `<AccessDenied />` if the
  signed-in staff member lacks it — never a silently empty page.

`middleware.ts` only handles "is there a session at all" (redirect to
`/login`) and refreshing the Supabase auth cookie. The finer-grained
permission/MFA checks live in each route group's `layout.tsx` (see
`lib/auth/session.ts` for `getUserPermissions` and
`getAuthenticatorAssuranceLevel`), because those checks need a database
round-trip that doesn't belong in the Edge middleware runtime.

## Payments

`lib/payments/types.ts` defines a `PaymentGateway` interface
(`createCheckout`, `verifyWebhook`, `refund`, `getPayment`). The only
implementation today is `ComingSoonAdapter` — it never claims to collect
real payment. Every checkout flow (`/give`, `/shop` → `/cart`) still writes
a real `pending` row to `donations`/`orders` so nothing has to be rebuilt
once a Jamaican merchant account exists; only `lib/payments/index.ts`'s
`getPaymentGateway()` switch and the relevant adapter file need to change.
See `ROADMAP.md` for the provider comparison.

## Media

Sermon video stays on YouTube (the church already has a channel); Supabase
Storage holds images, sermon audio, and any private/paid downloads. See the
bucket table in `SECURITY.md`.

## SEO

Every public page sets `alternates.canonical` and page-specific metadata.
`app/sitemap.ts` and `app/robots.ts` are Next.js metadata routes generated
from live data (published sermons/events/products/groups), not a static
file that goes stale. `components/json-ld.tsx` renders structured data
(`Church`/`Organization` on the homepage, `Event` on event pages,
`VideoObject` on sermon pages, `Product`+`Offer` on shop pages) per Google's
documented types.

## What's deliberately not built yet

See `ROADMAP.md` for the full list and reasoning — check-in/attendance,
service-planning run sheets, the communications/campaign engine, semantic
search, multi-campus admin UI, accounting sync, and live payment processing
are all schema-ready or interface-ready but not implemented in this pass.
