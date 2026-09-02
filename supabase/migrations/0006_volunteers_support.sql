-- Volunteer scheduling and member-facing support tables.

create table public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  ministry_id uuid references public.ministries(id) on delete set null,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  slots integer not null default 1 check (slots > 0),
  created_at timestamptz not null default now()
);
create index volunteer_shifts_opportunity_idx on public.volunteer_shifts (opportunity_id, starts_at);

create table public.volunteer_assignments (
  shift_id uuid not null references public.volunteer_shifts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'confirmed', 'declined', 'completed')),
  responded_at timestamptz,
  primary key (shift_id, profile_id)
);
create index volunteer_assignments_profile_idx on public.volunteer_assignments (profile_id);

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default false,
  categories jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();
