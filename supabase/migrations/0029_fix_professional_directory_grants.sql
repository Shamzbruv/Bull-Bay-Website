-- This project's default privileges auto-grant every new relation (tables
-- AND views) full DML rights to both anon and authenticated the instant
-- it's created — so the view's own "grant select ... to authenticated" in
-- 0028 only added to that, it never took away anon's default access, and
-- authenticated was left with insert/update/delete on what turned out to
-- be an auto-updatable view (a plain select over one table), which would
-- have let any signed-in member edit *any* profile's name through it,
-- bypassing profiles' normal own-row-only RLS entirely (views run as
-- their owner, so profiles' RLS doesn't apply here at all). Lock it down
-- to exactly what was intended: authenticated, read-only.
revoke all on public.professional_directory from anon, authenticated, public;
grant select on public.professional_directory to authenticated;
