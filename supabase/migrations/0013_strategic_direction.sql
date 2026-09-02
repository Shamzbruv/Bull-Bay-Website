-- Strategic direction domain: the 2026-2027 Church Members Conference
-- content, modeled as editable data rather than hard-coded copy or an
-- embedded slide deck. See docs/CONFERENCE_IMPORT.md for the source
-- mapping and docs/CONFERENCE_RECONCILIATION.md for names/roles that need
-- staff confirmation before they're treated as authoritative.
--
-- Privacy is the driving design constraint here, not an afterthought:
-- ministry_assignments defaults public_visible = false, is never matched
-- to a profiles row automatically, and has no anonymous policy beyond
-- rows a church administrator has explicitly approved for public display.

-- church_years -----------------------------------------------------------
create table public.church_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, label)
);
create trigger church_years_set_updated_at before update on public.church_years
  for each row execute function public.set_updated_at();

-- strategic_movements: the seven "W" local ministry movements ------------
create table public.strategic_movements (
  id uuid primary key default gen_random_uuid(),
  church_year_id uuid not null references public.church_years(id) on delete cascade,
  slug citext not null,
  name text not null,
  short_label text,
  description text,
  objective text,
  expected_outcome text,
  sort_order integer not null default 0,
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_year_id, slug)
);
create trigger strategic_movements_set_updated_at before update on public.strategic_movements
  for each row execute function public.set_updated_at();

-- strategic_goals: SMART goals under each movement ------------------------
create table public.strategic_goals (
  id uuid primary key default gen_random_uuid(),
  strategic_movement_id uuid not null references public.strategic_movements(id) on delete cascade,
  goal_text text not null,
  metric_type text,
  target_value numeric,
  target_unit text,
  due_on date,
  progress_value numeric,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'achieved', 'at_risk')),
  public_visible boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger strategic_goals_set_updated_at before update on public.strategic_goals
  for each row execute function public.set_updated_at();

-- doctrine_statements: the 14-point Declaration of Faith ------------------
create table public.doctrine_statements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ordinal integer not null,
  statement text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ordinal)
);
create trigger doctrine_statements_set_updated_at before update on public.doctrine_statements
  for each row execute function public.set_updated_at();

-- ministry_assignments: the 2026-2027 worker roster -----------------------
-- profile_id stays null until a staff member has verified the person and
-- deliberately linked them — see the non-negotiable rule against matching
-- profiles from a displayed name alone. display_name carries the roster
-- name in the meantime and is never shown publicly on its own.
create table public.ministry_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text,
  position_title text not null,
  church_year_id uuid references public.church_years(id) on delete set null,
  is_active boolean not null default true,
  public_visible boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_assignments_identity check (profile_id is not null or display_name is not null)
);
create trigger ministry_assignments_set_updated_at before update on public.ministry_assignments
  for each row execute function public.set_updated_at();
create index ministry_assignments_ministry_idx on public.ministry_assignments (ministry_id, sort_order);
create index ministry_assignments_profile_idx on public.ministry_assignments (profile_id);

create or replace function public.audit_ministry_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (new.organization_id, (select auth.uid()), 'ministry_assignment.created', 'ministry_assignments', new.id::text,
      jsonb_build_object('ministry_id', new.ministry_id, 'position_title', new.position_title, 'public_visible', new.public_visible));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (new.organization_id, (select auth.uid()), 'ministry_assignment.updated', 'ministry_assignments', new.id::text,
      jsonb_build_object(
        'profile_id_changed', old.profile_id is distinct from new.profile_id,
        'public_visible_from', old.public_visible, 'public_visible_to', new.public_visible,
        'is_active_to', new.is_active
      ));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (old.organization_id, (select auth.uid()), 'ministry_assignment.deleted', 'ministry_assignments', old.id::text,
      jsonb_build_object('ministry_id', old.ministry_id, 'position_title', old.position_title));
    return old;
  end if;
  return null;
end;
$$;

create trigger ministry_assignments_audit
  after insert or update or delete on public.ministry_assignments
  for each row execute function public.audit_ministry_assignment_change();

-- annual_plan_items: month-only plans that may later become real events --
create table public.annual_plan_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  church_year_id uuid not null references public.church_years(id) on delete cascade,
  ministry_id uuid references public.ministries(id) on delete set null,
  title text not null,
  description text,
  category text,
  month text not null,
  planned_date date,
  status text not null default 'planned' check (status in ('planned', 'ready_to_publish', 'published', 'cancelled')),
  event_id uuid references public.events(id) on delete set null,
  visibility text not null default 'internal' check (visibility in ('internal', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger annual_plan_items_set_updated_at before update on public.annual_plan_items
  for each row execute function public.set_updated_at();
create index annual_plan_items_year_idx on public.annual_plan_items (church_year_id, month);

-- New permission codes -----------------------------------------------------
insert into public.permissions (code, description) values
  ('direction.manage', 'Manage church years, strategic movements, goals and doctrine content'),
  ('ministry_assignments.manage', 'Manage the ministry worker roster and public visibility of assignments');

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('direction.manage'), ('ministry_assignments.manage')
) as x(code) where r.code = 'church_admin';

insert into public.role_permissions (role_id, permission_code)
select r.id, 'direction.manage' from public.roles r where r.code = 'pastor';

-- super_admin already gets every permission via the existing wildcard seed
-- (0008_seed_roles_permissions.sql inserts super_admin against all rows in
-- public.permissions), so it automatically picks up both new codes here.
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'super_admin'
  and p.code in ('direction.manage', 'ministry_assignments.manage')
on conflict do nothing;

-- RLS ----------------------------------------------------------------------
alter table public.church_years enable row level security;
create policy "church_years public read" on public.church_years
  for select to anon, authenticated using (true);
create policy "church_years staff manage" on public.church_years
  for all to authenticated
  using (public.has_permission(organization_id, 'direction.manage'))
  with check (public.has_permission(organization_id, 'direction.manage'));

alter table public.strategic_movements enable row level security;
create policy "strategic_movements public read" on public.strategic_movements
  for select to anon, authenticated using (public_visible);
create policy "strategic_movements staff manage" on public.strategic_movements
  for all to authenticated
  using (exists (select 1 from public.church_years cy where cy.id = church_year_id and public.has_permission(cy.organization_id, 'direction.manage')))
  with check (exists (select 1 from public.church_years cy where cy.id = church_year_id and public.has_permission(cy.organization_id, 'direction.manage')));

alter table public.strategic_goals enable row level security;
create policy "strategic_goals public read" on public.strategic_goals
  for select to anon, authenticated using (public_visible);
create policy "strategic_goals staff manage" on public.strategic_goals
  for all to authenticated
  using (exists (
    select 1 from public.strategic_movements sm join public.church_years cy on cy.id = sm.church_year_id
    where sm.id = strategic_movement_id and public.has_permission(cy.organization_id, 'direction.manage')
  ))
  with check (exists (
    select 1 from public.strategic_movements sm join public.church_years cy on cy.id = sm.church_year_id
    where sm.id = strategic_movement_id and public.has_permission(cy.organization_id, 'direction.manage')
  ));

alter table public.doctrine_statements enable row level security;
create policy "doctrine_statements public read" on public.doctrine_statements
  for select to anon, authenticated using (status = 'published');
create policy "doctrine_statements staff manage" on public.doctrine_statements
  for all to authenticated
  using (public.has_permission(organization_id, 'content.manage'))
  with check (public.has_permission(organization_id, 'content.manage'));

-- ministry_assignments: the sensitive one. Public sees only rows a staff
-- member explicitly flagged public_visible; a member sees their own linked
-- assignments; staff with ministry_assignments.manage see and edit all.
alter table public.ministry_assignments enable row level security;
create policy "ministry_assignments public read" on public.ministry_assignments
  for select to anon, authenticated using (public_visible and is_active);
create policy "ministry_assignments own read" on public.ministry_assignments
  for select to authenticated using (profile_id = public.current_profile_id());
create policy "ministry_assignments staff manage" on public.ministry_assignments
  for all to authenticated
  using (public.has_permission(organization_id, 'ministry_assignments.manage'))
  with check (public.has_permission(organization_id, 'ministry_assignments.manage'));

-- annual_plan_items: fully internal — no anonymous or member policy.
alter table public.annual_plan_items enable row level security;
create policy "annual_plan_items staff manage" on public.annual_plan_items
  for all to authenticated
  using (public.has_permission(organization_id, 'events.manage'))
  with check (public.has_permission(organization_id, 'events.manage'));
