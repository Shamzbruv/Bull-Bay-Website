# Calendar sync

How the pastoral-team calendars stay in step with Google Calendar, and what
members see.

## What members see

`/member/church-calendar` shows published church events and the schedule of
the pastor and every active pastoral-team member (deacons, deaconesses and
elders join automatically when given that role), one colour per person, in
Month, Week and Agenda views. Entries a person marked private reach the
browser only as grey "Busy" blocks: `lib/calendar/church-calendar.ts` drops
the title, location and link on the server.

## Two-way Google sync

A connected Google account gets a church calendar the platform creates
(scope `calendar.app.created`, so the platform can touch only that calendar,
never the rest of the account). Entries move both ways:

| Where it happens | What the other side does |
| --- | --- |
| Added in Google | Added on the website (public unless marked Private in Google) |
| Edited in Google (title, time, location, video link, privacy) | Website entry updated |
| Deleted in Google | Website entry deleted |
| Added, edited or deleted on the website | Google follows |

Not two-way, on purpose:

- **Weekly working hours** are set on the website and mirrored to Google as
  recurring "Available" entries. Editing them in Google has no effect.
- **Counselling appointments booked by members** are owned by the platform
  (requests, notifications, cancellation). An edit or deletion in Google is
  put back.
- Google entries shown as "Free" do not block time and are not imported.

The worker (`lib/office/worker.ts`) checks each connection about once a
minute (every five minutes while one is failing). Opening a calendar page
refreshes any connection not checked in the last 30 seconds, and every
website change pushes immediately.

## How conflicts are decided

`lib/calendar/sync-core.ts` is a pure three-way merge. For every mirrored
entry the sync remembers a fingerprint of the content both sides last agreed
on (`calendar_event_links.synced_hash`). Comparing each side against it says
who changed: only Google, only the website, or both. If both, the more
recent edit wins. Nothing is ever overwritten blindly, and updates to
existing Google entries send only the synced fields (a `PATCH`), so
attendees, reminders and Meet details survive.

Safeguards: a Google entry is only treated as deleted after Google confirms
it directly; entries outside the synced window (90 days back, 400 ahead) are
never deleted on the strength of not being listed; an imported entry has an
id derived from its Google id, so a crash cannot create a duplicate; a
per-connection lock stops overlapping syncs.

What the sync did is written to `calendar_sync_log` and shown under each
calendar ("Recent sync activity").

## Overlaps

Google calendars hold overlapping entries, so entries imported from Google
may overlap. Entries typed into the website still may not overlap an
appointment or each other (`private.guard_entry_overlap`), and booked
appointments can never overlap each other (exclusion constraint).

## Tests

`tests/calendar-sync-core.test.cjs` (the merge rules), `calendar-sync-engine`
(full flows against an in-memory Google and database), `calendar-google-api`
(request shapes, retries). Database rules: `tests/roles-and-calendars.sql`.
