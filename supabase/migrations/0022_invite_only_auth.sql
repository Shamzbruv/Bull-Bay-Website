-- Invite-only membership: an account can only ever be created by an admin
-- (via the Supabase Admin API, server-side), never through public
-- self-service signup. This migration adds the profile fields collected
-- during that invite (membership/job/personal information) and the
-- password-reset flag used when an admin issues someone a temporary
-- password.

alter table public.profiles
  add column if not exists job_title text,
  add column if not exists employer text,
  add column if not exists marital_status text,
  add column if not exists address_line1 text,
  add column if not exists city text,
  add column if not exists parish text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists invited_by uuid references auth.users(id),
  add column if not exists invited_at timestamptz;
