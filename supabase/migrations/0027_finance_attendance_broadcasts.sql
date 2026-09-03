-- Finance: expenses ledger, plus read-only sales visibility for finance
-- staff (they should see every shop sale for tracking, without needing
-- shop.manage's ability to fulfill/edit orders).
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fund_id uuid references public.funds(id) on delete set null,
  category text not null,
  vendor text,
  description text,
  amount_minor integer not null check (amount_minor > 0),
  currency char(3) not null default 'JMD',
  expense_date date not null default current_date,
  receipt_path text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create index expenses_org_idx on public.expenses (organization_id, expense_date desc);

alter table public.expenses enable row level security;
create policy "expenses staff read" on public.expenses
  for select to authenticated
  using (public.has_permission(organization_id, 'giving.read') or public.has_permission(organization_id, 'giving.manage'));
create policy "expenses staff manage" on public.expenses
  for all to authenticated
  using (public.has_permission(organization_id, 'giving.manage'))
  with check (public.has_permission(organization_id, 'giving.manage'));

drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders
  for select to authenticated
  using (
    customer_profile_id = public.current_profile_id()
    or public.has_permission(organization_id, 'shop.manage')
    or public.has_permission(organization_id, 'giving.read')
    or public.has_permission(organization_id, 'giving.manage')
  );

-- Pastor sees the finance dashboard, read-only.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'giving.read' from public.roles r where r.code = 'pastor'
on conflict do nothing;

-- Attendance -------------------------------------------------------------
-- Recurring service items the pastor/church exec set up; the secretary
-- team (or whoever they delegate) submits a headcount against each one
-- every week.
create table public.service_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  service_time time not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index service_schedules_org_idx on public.service_schedules (organization_id, is_active, sort_order);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_schedule_id uuid not null references public.service_schedules(id) on delete cascade,
  service_date date not null,
  headcount integer not null check (headcount >= 0),
  notes text,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz not null default now(),
  unique (service_schedule_id, service_date)
);
create index attendance_records_org_idx on public.attendance_records (organization_id, service_date desc);

insert into public.permissions (code, description) values
  ('attendance.manage', 'Set up service schedules and record/edit attendance for any of them'),
  ('attendance.submit', 'Submit weekly attendance counts for scheduled services');

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values ('attendance.manage')) as x(code)
where r.code in ('church_admin', 'pastor')
on conflict do nothing;
insert into public.role_permissions (role_id, permission_code)
select r.id, 'attendance.submit' from public.roles r where r.code = 'secretary'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where r.code = 'super_admin' and p.code in ('attendance.manage', 'attendance.submit')
on conflict do nothing;

alter table public.service_schedules enable row level security;
create policy "service_schedules authenticated read" on public.service_schedules
  for select to authenticated using (true);
create policy "service_schedules staff manage" on public.service_schedules
  for all to authenticated
  using (public.has_permission(organization_id, 'attendance.manage'))
  with check (public.has_permission(organization_id, 'attendance.manage'));

alter table public.attendance_records enable row level security;
create policy "attendance_records authenticated read" on public.attendance_records
  for select to authenticated using (true);
create policy "attendance_records staff submit" on public.attendance_records
  for all to authenticated
  using (public.has_permission(organization_id, 'attendance.manage') or public.has_permission(organization_id, 'attendance.submit'))
  with check (public.has_permission(organization_id, 'attendance.manage') or public.has_permission(organization_id, 'attendance.submit'));

-- Pastor's Desk broadcasts -------------------------------------------------
create table public.pastor_broadcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index pastor_broadcasts_org_idx on public.pastor_broadcasts (organization_id, created_at desc);

insert into public.permissions (code, description) values
  ('broadcasts.send', 'Send a "From the Pastor''s Desk" broadcast to every member');

insert into public.role_permissions (role_id, permission_code)
select r.id, 'broadcasts.send' from public.roles r where r.code in ('pastor', 'church_admin')
on conflict do nothing;
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where r.code = 'super_admin' and p.code = 'broadcasts.send'
on conflict do nothing;

alter table public.pastor_broadcasts enable row level security;
create policy "pastor_broadcasts authenticated read" on public.pastor_broadcasts
  for select to authenticated using (true);
create policy "pastor_broadcasts staff send" on public.pastor_broadcasts
  for insert to authenticated with check (public.has_permission(organization_id, 'broadcasts.send'));
create policy "pastor_broadcasts staff manage" on public.pastor_broadcasts
  for delete to authenticated using (public.has_permission(organization_id, 'broadcasts.send'));

-- Bulletin/news reuses the existing `announcements` table (content.manage)
-- — just extend that permission to the secretary team so they can post it.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'content.manage' from public.roles r where r.code = 'secretary'
on conflict do nothing;

-- Realtime: dashboards refresh the moment attendance or a broadcast lands.
do $$ begin
  alter publication supabase_realtime add table public.attendance_records;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.pastor_broadcasts;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null;
end $$;
