# Roadmap

This build covers the blueprint's **Foundation** release plus the start of
**Church Management** (people/households, groups, events + registration,
volunteers). It does not — and, realistically, no single pass could —
cover the full platform the two source documents describe; their own
estimate for just the Foundation release is 3-5 developer-weeks, with
Church Management (+4-6 weeks), Commerce (+3-4 weeks), and further phases
on top of that.

## Deferred (schema may exist, no UI built)

- **Check-in / attendance kiosk** — safeguarding-sensitive, needs its own
  design pass before building.
- **Full service-planning run sheets** (order of service, assigned
  volunteers, media/slides) — `pastor` workspace only covers sermon
  planning and care today.
- **Communications / campaign engine** — no SendGrid/Twilio integration
  yet. `communications.send` permission is seeded but unused.
- **Semantic / pgvector sermon search** — today's search is Postgres full
  text (`sermons_search_idx`) plus a `topics` array filter. The blueprint's
  pgvector/hybrid-search pattern is a clean addition later, not a rewrite.
- **Multi-campus admin UI** — the schema is multi-campus-shaped
  (`campuses`, `campus_id` on most content tables) but only one campus is
  seeded and there's no "add a campus" screen yet.
- **QuickBooks/Xero accounting sync, Zapier/Make webhook management** —
  `integrations.manage` permission is seeded but unused.
- **Workflow/form builder, native apps, resource booking** — not started.
- **Google Calendar two-way sync** — the public `.ics` feed
  (`/calendar.ics`) exists; Calendar API sync does not.

## Payments — not connected yet, by design

`lib/payments` implements the adapter interface with only a
`ComingSoonAdapter`. The blueprint's own instruction is explicit: don't
write live payment code before a merchant account exists. Comparison to
revisit once the church is ready to choose:

| Provider | Fit for Jamaica | Notes |
|---|---|---|
| **PayPal** | Strong starting option | Jamaica-specific business checkout + recurring payments already exist |
| **WiPay** | Strong regional candidate | Caribbean-built, advertises local-bank settlement — confirm exact Jamaica terms during onboarding |
| **Powertranz / First Atlantic Commerce** | Institutional option | Bank/acquirer-oriented, Caribbean + Central America focus |
| **Stripe** | Not recommended as default | Jamaica isn't on Stripe's direct Payments merchant-country list (Global Payouts ≠ Payments) |

Once a provider is chosen: implement its adapter in `lib/payments/`,
set `PAYMENT_PROVIDER` and the provider's credentials in the environment,
and wire a webhook route under `app/api/webhooks/[provider]/` that inserts
into `webhook_events` (idempotent on `(provider, provider_event_id)`)
before mutating any `order`/`donation`/`payment` row.

## Definition of done, reproduced from the blueprint

Checked = built and verified this pass. Unchecked items marked either
**(later phase)** or **(church/legal action)** — this codebase can't check
those boxes for you.

- [x] Supabase production project provisioned (`gfbeauuvicewxtuuvndf`)
- [x] RLS enabled and policied for every browser-accessible table
- [x] Anonymous users cannot retrieve member/private records (verified: `set role anon`)
- [x] Members cannot retrieve another member's giving/order history (RLS: `donor_profile_id = current_profile_id()`)
- [x] Pastoral records have explicit care-team authorization (`care_case_access`)
- [x] Ordinary content editors cannot see donations (permission separation)
- [x] Staff MFA is enforced (route-group AAL2 gate)
- [x] Digital product URLs are private and expire (5-minute signed URLs, entitlement-checked)
- [x] Webhook idempotency table exists (`webhook_events`, unique constraint) **(no live webhook yet — see above)**
- [ ] Church legal/entity name and merchant details confirmed **(church action)**
- [ ] Exact service times, leadership, ministry descriptions approved by staff **(church action — current content is carried over from the previous site as a starting point)**
- [ ] Payment gateway contract approved for the Jamaican legal entity **(church action)**
- [ ] Provider webhooks cryptographically verified **(later phase, once a provider is chosen)**
- [ ] Duplicate payment webhooks cannot create duplicate fulfilment **(later phase — table is ready, logic isn't wired to a real provider)**
- [ ] Refund authorization tested **(later phase)**
- [ ] Physical inventory reservations / refund-restock flows tested end-to-end **(later phase)**
- [ ] Jamaican tax/GCT treatment reviewed professionally **(church action)**
- [ ] Data-controller registration/compliance with Jamaica's OIC addressed **(church/legal action)**
- [ ] Privacy notice and communication consents approved **(church action — `communication_email_opt_in`/`communication_sms_opt_in` fields exist, no published privacy notice yet)**
- [ ] Data retention/deletion schedules documented **(church/legal action)**
- [ ] Breach-response plan incl. Jamaica's 72-hour OIC requirement **(church/legal action)**
- [ ] Storage-object backup configured separately from database backup **(operational, once real files exist)**
- [ ] At least one restore test succeeded **(operational)**
- [ ] WCAG 2.2 AA audit completed **(later phase — built with semantic HTML/labels/skip-link/focus states, not yet audited)**
- [x] Structured data implemented for church, events, video and products
- [ ] Mobile checkout/registration/giving tested on real phones **(manual QA needed)**
- [ ] Core Web Vitals measured **(needs a deployed URL — see below)**
- [ ] Production secrets exist only server-side — **verified for this codebase**, re-verify in whatever hosting dashboard is used for deployment
- [ ] Dependency and secret scanning run in CI **(no CI configured yet — `package.json` has `lint`/`typecheck` scripts ready to wire into GitHub Actions)**
- [x] Audit trail exists for permissions, refunds, and care-access changes

## Next steps to actually launch

1. Church staff review and correct all seeded content (`/admin` → People,
   Events, Settings) — names, dates, address, phone are the previous
   site's placeholders/real content carried forward, not re-verified here.
2. Choose and underwrite a payment provider; implement its adapter.
3. Get Jamaican privacy/legal review before real member data is imported.
4. Set up hosting (Vercel is the natural fit — `vercel.json` is ready) and
   point a real domain at it; nothing has been deployed by this build.
5. Scope and build the next module (communications, or full commerce) as
   its own pass, using this same migration + RLS pattern.
