-- Public content & engagement domain: pages, sermons, events, ministries,
-- groups, announcements.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug citext not null,
  title text not null,
  body text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create trigger pages_set_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

create table public.sermon_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug citext not null,
  title text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  series_id uuid references public.sermon_series(id) on delete set null,
  slug citext not null,
  title text not null,
  speaker text,
  scripture_references text[] not null default '{}',
  topics text[] not null default '{}',
  summary text,
  transcript text,
  video_provider text check (video_provider in ('youtube', 'cloudflare_stream')),
  video_id text,
  audio_path text,
  thumbnail_url text,
  duration_seconds integer,
  preached_at date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create trigger sermons_set_updated_at before update on public.sermons
  for each row execute function public.set_updated_at();
-- to_tsvector(regconfig, text) is STABLE (not IMMUTABLE) in core Postgres,
-- so it can't be used directly in an index expression. This wrapper pins
-- the 'english' configuration and is safe to mark IMMUTABLE because this
-- application never changes search configuration at runtime. (topics is
-- deliberately excluded from the text blob — array_to_string() is STABLE
-- here too; topic filtering instead uses the separate GIN array index
-- below, e.g. `where topics && array['prayer']`.)
create or replace function public.immutable_english_tsvector(input text)
returns tsvector
language sql
immutable
as $$
  select to_tsvector('english'::regconfig, input);
$$;

create index sermons_search_idx on public.sermons using gin (
  public.immutable_english_tsvector(
    coalesce(title, '') || ' ' || coalesce(speaker, '') || ' ' ||
    coalesce(summary, '') || ' ' || coalesce(transcript, '')
  )
);
create index sermons_topics_idx on public.sermons using gin (topics);
create index sermons_published_idx on public.sermons (organization_id, status, preached_at desc);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  slug citext not null,
  title text not null,
  description text,
  category text,
  location_name text,
  online_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer,
  registration_required boolean not null default false,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  price_minor integer not null default 0,
  image_url text,
  visibility text not null default 'public' check (visibility in ('public', 'members', 'staff')),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create index events_upcoming_idx on public.events (organization_id, status, starts_at);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email citext,
  guest_phone text,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'registered' check (status in ('registered', 'waitlisted', 'cancelled', 'attended')),
  notes text,
  created_at timestamptz not null default now(),
  constraint event_registrations_identity check (
    profile_id is not null or (guest_name is not null and guest_email is not null)
  )
);
create index event_registrations_event_idx on public.event_registrations (event_id);
create index event_registrations_profile_idx on public.event_registrations (profile_id);

create table public.ministries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug citext not null,
  name text not null,
  description text,
  icon text,
  leader_profile_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  ministry_id uuid references public.ministries(id) on delete set null,
  slug citext not null,
  name text not null,
  category text,
  description text,
  meeting_schedule text,
  location_area text,
  capacity integer,
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'leader', 'co_leader')),
  status text not null default 'active' check (status in ('requested', 'active', 'inactive')),
  joined_at timestamptz not null default now(),
  unique (group_id, profile_id)
);
create index group_members_profile_idx on public.group_members (profile_id);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete set null,
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
