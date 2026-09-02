# Bull Bay Digital Church

A Next.js 16 + Supabase digital church platform for New Testament Church of
God, Bull Bay — public website, member portal, pastor workspace, and
church-management admin, built from the two blueprint documents in this
repo (`Deep Research Blueprint...pdf`, `Building the Best Church
Website...pdf`).

The previous static single-page site is preserved as reference in
[`legacy-static/`](legacy-static/).

## Stack

Next.js 16 (App Router, TypeScript, React 19) · Supabase (Postgres 17,
Auth, Storage, RLS) · plain CSS design system ported from the original
site's claymorphism look.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Requires Node 22+ (the Supabase SDKs declare that as their minimum). Use
`nvm use 22` if your default is older.

The Supabase project (`gfbeauuvicewxtuuvndf`) already has the full schema,
RLS policies, storage buckets, and starting content applied — see
`supabase/migrations/` for the versioned source and `docs/DATA_MODEL.md`
for what it means.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build (also run `npm run typecheck` and
  `npm run lint` before shipping changes)
- `npm run start` — run a production build locally

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is put together
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — the database schema and its rules
- [`docs/SECURITY.md`](docs/SECURITY.md) — RLS, permissions, MFA, what's still a manual/legal step
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's built, what's deferred, and the blueprint's Definition of Done checklist

## What's here vs. what's next

This build is the blueprint's **Foundation** release plus the start of
**Church Management**: the full public site, real Supabase-backed content,
member/pastor/admin workspaces with RLS-enforced permissions and MFA, and
giving/shop flows that record real intent without processing live payment
(no merchant account exists yet — see `docs/ROADMAP.md`). Commerce/giving
go live once the church selects a Jamaica-capable payment provider;
communications, semantic search, multi-campus admin, and accounting sync
are scoped but not built. Nothing has been deployed — see `docs/ROADMAP.md`
for next steps.
