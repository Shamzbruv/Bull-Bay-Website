# 2026–2027 Church Members Conference — import notes

Source: `Bull_Bay_Church_Members_Conference_2026-2027.pptx` (51 slides). This
document records what was imported, where it lives, and what stayed
deliberately internal. See `CONFERENCE_RECONCILIATION.md` for the specific
roster rows that need a staff member's confirmation.

## What became structured data (not hard-coded copy)

| Slides | Content | Table |
|---|---|---|
| 3 | Vision statement, six identity pillars | rendered from copy on `/about` (short, stable — not worth a table) |
| 3-4 | Mission statement, seven commitments | same — stable copy on `/about` |
| 5 | Seven core values | same — stable copy on `/about` |
| 6 | Seven strategic priorities, two marked primary focus | `strategic_priorities` |
| 8-15 | Seven local movements + objective/expected outcome/SMART goals | `strategic_movements`, `strategic_goals` |
| 16-17 | 14-point Declaration of Faith | `doctrine_statements` |
| 19-47 | Ministry worker roster (~250 rows across 23 ministries) | `ministry_assignments` (all `public_visible = false`, `profile_id = null` until staff review) |
| 48-50 | Annual calendar | 21 dated anchors → `events` (`status = 'draft'`); 35 month-only actions → `annual_plan_items` |

The vision/mission/values text is short, church-identity-level content that
isn't expected to change mid-year and isn't part of the brief's required
schema changes, so it's kept as page copy rather than a database table —
unlike the movements/goals/doctrine/roster/calendar, which the brief
explicitly requires to be editable data.

## Deliberately not imported as public-facing structure

- **Choir, cleaning rota, and internal role lists** never appear on any
  public route or query — see `lib/data/public.ts#getPublicMinistryLeaders`,
  which only ever selects `public_visible = true` rows.
- **Administrative Team** and **Church Cleaning** exist as `ministries` rows
  (so their roster rows have a valid foreign key) but with `is_active =
  false`, which keeps them out of the public `/ministries` listing and 404s
  their detail page.
- The **"Evangelism, Discipleship & Mission"** ministry from the deck reuses
  the site's existing `community-outreach` slug/URL rather than creating a
  duplicate ministry.

## Events vs. annual plan items

An activity became a draft `events` row only if the deck gave it a specific
day (even where the deck didn't give a time — those get a placeholder time
and stay in `draft` status until a staff member confirms it). An activity
with only a month (no day) became an `annual_plan_items` row instead, and
is promoted to a real event only through Admin → Annual Plan → "Promote to
event," which requires a staff member to supply the exact date/time,
location and visibility.

## Regenerating this import

The seed migrations (`0013`–`0021` in `supabase/migrations/`) are the
source of truth and were generated from
`/private/tmp/.../scratchpad/gen_direction_seed.py`,
`gen_roster_seed.py` and `gen_calendar_seed.py` (session-local scratch
files, not committed) — if the deck is revised, regenerate equivalent
migrations rather than hand-editing the seeded rows, so the SQL and the
reconciliation report stay in sync.
