-- This project has one Supabase environment today (no separate local/dev
-- split), so the reference/seed content (roles, permissions, funds,
-- sermons, events, ministries, shop items) lives directly in the numbered
-- migrations (0008_seed_roles_permissions.sql, 0009_seed_content.sql) and
-- is applied there rather than here. This file exists so `supabase start` /
-- `supabase db reset` tooling has something to run without erroring; it is
-- intentionally a no-op.
select 1;
