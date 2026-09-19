-- The admin "Pastoral Team" screen's own copy said "mark exactly one
-- person as the Senior Pastor," but nothing enforced it — two rows could
-- both carry is_pastor=true and is_active=true. Every screen that asks
-- "who is the pastor" (the pastor & calendar page, counsel-request
-- routing) picks whichever one sorts first and trusts there is only one,
-- so a second checked box didn't error — it silently made the wrong
-- person's calendar "the" pastor's while the real one sat unreachable.
-- The application now clears the flag on every other row before setting
-- it (see app/(admin)/admin/pastoral-team/actions.ts); this index is the
-- same guarantee enforced at the database, so it holds even if a future
-- change to that code forgets to.
--
-- Deliberately not a unique index on the whole table — an org may have
-- several inactive/former "Pastor"-titled rows (people who moved on, were
-- entered twice, etc.), so the constraint only applies to the row that is
-- actually live: is_pastor and is_active both true.
create unique index if not exists one_active_senior_pastor_per_org
  on public.pastoral_team_members (organization_id)
  where is_pastor and is_active;
