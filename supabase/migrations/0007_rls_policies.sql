-- Row Level Security for every table in the schema. Nothing in `public` is
-- left exposed by default — a table with RLS enabled and no matching policy
-- denies all access to anon/authenticated (service_role always bypasses RLS,
-- which is how server-side webhook/payment/export code works).

create or replace function public.current_household_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select household_id from public.profiles where auth_user_id = (select auth.uid()) limit 1;
$$;

-- organizations --------------------------------------------------------
alter table public.organizations enable row level security;
create policy "organizations public read" on public.organizations
  for select to anon, authenticated using (true);
create policy "organizations staff manage" on public.organizations
  for all to authenticated
  using (public.has_permission(id, 'sites.manage'))
  with check (public.has_permission(id, 'sites.manage'));

-- campuses ----------------------------------------------------------------
alter table public.campuses enable row level security;
create policy "campuses public read" on public.campuses
  for select to anon, authenticated using (true);
create policy "campuses staff manage" on public.campuses
  for all to authenticated
  using (public.has_permission(organization_id, 'sites.manage'))
  with check (public.has_permission(organization_id, 'sites.manage'));

-- households ----------------------------------------------------------------
alter table public.households enable row level security;
create policy "households own read" on public.households
  for select to authenticated
  using (id = public.current_household_id() or public.has_permission(organization_id, 'people.read'));
create policy "households member create" on public.households
  for insert to authenticated with check (true);
create policy "households own update" on public.households
  for update to authenticated
  using (id = public.current_household_id() or public.has_permission(organization_id, 'people.write'))
  with check (id = public.current_household_id() or public.has_permission(organization_id, 'people.write'));
create policy "households staff delete" on public.households
  for delete to authenticated using (public.has_permission(organization_id, 'people.write'));

-- profiles ------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy "profiles household read" on public.profiles
  for select to authenticated using (household_id = public.current_household_id());
create policy "profiles group leader read" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.group_members gm
      where gm.profile_id = profiles.id
        and gm.group_id in (
          select group_id from public.group_members leader
          where leader.profile_id = public.current_profile_id() and leader.role in ('leader', 'co_leader')
        )
    )
  );
create policy "profiles staff read" on public.profiles
  for select to authenticated using (public.has_permission(organization_id, 'people.read'));
create policy "profiles self update" on public.profiles
  for update to authenticated
  using (auth_user_id = (select auth.uid()) or public.has_permission(organization_id, 'people.write'))
  with check (auth_user_id = (select auth.uid()) or public.has_permission(organization_id, 'people.write'));
create policy "profiles staff insert" on public.profiles
  for insert to authenticated with check (public.has_permission(organization_id, 'people.write'));
create policy "profiles staff delete" on public.profiles
  for delete to authenticated using (public.has_permission(organization_id, 'people.write'));

-- roles / permissions ---------------------------------------------------
alter table public.roles enable row level security;
create policy "roles read" on public.roles for select to authenticated using (true);
create policy "roles staff manage" on public.roles
  for all to authenticated
  using (public.has_permission(organization_id, 'roles.manage'))
  with check (public.has_permission(organization_id, 'roles.manage'));

alter table public.permissions enable row level security;
create policy "permissions read" on public.permissions for select to authenticated using (true);

alter table public.role_permissions enable row level security;
create policy "role_permissions read" on public.role_permissions for select to authenticated using (true);
create policy "role_permissions staff manage" on public.role_permissions
  for all to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and public.has_permission(r.organization_id, 'roles.manage')))
  with check (exists (select 1 from public.roles r where r.id = role_id and public.has_permission(r.organization_id, 'roles.manage')));

alter table public.user_roles enable row level security;
create policy "user_roles self read" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or public.has_permission(organization_id, 'roles.manage'));
create policy "user_roles staff manage" on public.user_roles
  for all to authenticated
  using (public.has_permission(organization_id, 'roles.manage'))
  with check (public.has_permission(organization_id, 'roles.manage'));

-- audit_logs: readable by roles.manage only; writes only via security ------
-- definer triggers / service role (no policy = no direct client writes).
alter table public.audit_logs enable row level security;
create policy "audit_logs staff read" on public.audit_logs
  for select to authenticated
  using (organization_id is not null and public.has_permission(organization_id, 'roles.manage'));

-- pages ---------------------------------------------------------------------
alter table public.pages enable row level security;
create policy "pages public read" on public.pages
  for select to anon, authenticated using (status = 'published');
create policy "pages staff manage" on public.pages
  for all to authenticated
  using (public.has_permission(organization_id, 'content.manage'))
  with check (public.has_permission(organization_id, 'content.manage'));

-- sermon_series ---------------------------------------------------------
alter table public.sermon_series enable row level security;
create policy "sermon_series public read" on public.sermon_series
  for select to anon, authenticated using (true);
create policy "sermon_series staff manage" on public.sermon_series
  for all to authenticated
  using (public.has_permission(organization_id, 'sermons.manage'))
  with check (public.has_permission(organization_id, 'sermons.manage'));

-- sermons ---------------------------------------------------------------
alter table public.sermons enable row level security;
create policy "sermons public read" on public.sermons
  for select to anon, authenticated using (status = 'published');
create policy "sermons staff manage" on public.sermons
  for all to authenticated
  using (public.has_permission(organization_id, 'sermons.manage'))
  with check (public.has_permission(organization_id, 'sermons.manage'));

-- events ------------------------------------------------------------------
alter table public.events enable row level security;
create policy "events public read" on public.events
  for select to anon using (status = 'published' and visibility = 'public');
create policy "events member read" on public.events
  for select to authenticated using (status = 'published' and visibility in ('public', 'members'));
create policy "events staff manage" on public.events
  for all to authenticated
  using (public.has_permission(organization_id, 'events.manage'))
  with check (public.has_permission(organization_id, 'events.manage'));

-- event_registrations ---------------------------------------------------
alter table public.event_registrations enable row level security;
create policy "event_registrations own read" on public.event_registrations
  for select to authenticated using (
    profile_id = public.current_profile_id()
    or public.has_permission((select organization_id from public.events e where e.id = event_id), 'events.manage')
  );
create policy "event_registrations create" on public.event_registrations
  for insert to anon, authenticated
  with check (profile_id is null or profile_id = public.current_profile_id());
create policy "event_registrations own cancel" on public.event_registrations
  for update to authenticated
  using (profile_id = public.current_profile_id() or public.has_permission((select organization_id from public.events e where e.id = event_id), 'events.manage'))
  with check (profile_id = public.current_profile_id() or public.has_permission((select organization_id from public.events e where e.id = event_id), 'events.manage'));
create policy "event_registrations staff delete" on public.event_registrations
  for delete to authenticated
  using (public.has_permission((select organization_id from public.events e where e.id = event_id), 'events.manage'));

-- ministries ----------------------------------------------------------------
alter table public.ministries enable row level security;
create policy "ministries public read" on public.ministries
  for select to anon, authenticated using (is_active);
create policy "ministries staff manage" on public.ministries
  for all to authenticated
  using (public.has_permission(organization_id, 'content.manage'))
  with check (public.has_permission(organization_id, 'content.manage'));

-- groups ----------------------------------------------------------------
alter table public.groups enable row level security;
create policy "groups public read" on public.groups
  for select to anon using (visibility = 'public' and is_active);
create policy "groups member read" on public.groups
  for select to authenticated using (visibility in ('public', 'members') and is_active);
create policy "groups staff manage" on public.groups
  for all to authenticated
  using (public.has_permission(organization_id, 'groups.manage'))
  with check (public.has_permission(organization_id, 'groups.manage'));

-- group_members ---------------------------------------------------------
alter table public.group_members enable row level security;
create policy "group_members own read" on public.group_members
  for select to authenticated using (
    profile_id = public.current_profile_id()
    or public.has_permission((select organization_id from public.groups g where g.id = group_id), 'groups.manage')
    or group_id in (select group_id from public.group_members leader where leader.profile_id = public.current_profile_id() and leader.role in ('leader', 'co_leader'))
  );
create policy "group_members join request" on public.group_members
  for insert to authenticated with check (profile_id = public.current_profile_id());
create policy "group_members own leave" on public.group_members
  for update to authenticated
  using (profile_id = public.current_profile_id() or public.has_permission((select organization_id from public.groups g where g.id = group_id), 'groups.manage'))
  with check (profile_id = public.current_profile_id() or public.has_permission((select organization_id from public.groups g where g.id = group_id), 'groups.manage'));
create policy "group_members staff delete" on public.group_members
  for delete to authenticated
  using (public.has_permission((select organization_id from public.groups g where g.id = group_id), 'groups.manage'));

-- announcements ---------------------------------------------------------
alter table public.announcements enable row level security;
create policy "announcements public read" on public.announcements
  for select to anon, authenticated using (status = 'published');
create policy "announcements staff manage" on public.announcements
  for all to authenticated
  using (public.has_permission(organization_id, 'content.manage'))
  with check (public.has_permission(organization_id, 'content.manage'));

-- prayer_requests -------------------------------------------------------
alter table public.prayer_requests enable row level security;
create policy "prayer_requests own read" on public.prayer_requests
  for select to authenticated
  using (submitter_profile_id = public.current_profile_id() or public.has_permission(organization_id, 'care.read'));
create policy "prayer_requests submit" on public.prayer_requests
  for insert to anon, authenticated
  with check (submitter_profile_id is null or submitter_profile_id = public.current_profile_id());
create policy "prayer_requests staff manage" on public.prayer_requests
  for update to authenticated
  using (public.has_permission(organization_id, 'care.manage'))
  with check (public.has_permission(organization_id, 'care.manage'));
create policy "prayer_requests staff delete" on public.prayer_requests
  for delete to authenticated using (public.has_permission(organization_id, 'care.manage'));

-- care_cases: owner + explicit access list only, never broad "admin" -----
alter table public.care_cases enable row level security;
create policy "care_cases scoped read" on public.care_cases
  for select to authenticated using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.care_case_access cca where cca.case_id = care_cases.id and cca.user_id = (select auth.uid()))
    or public.has_permission(organization_id, 'care.manage')
  );
create policy "care_cases staff create" on public.care_cases
  for insert to authenticated with check (public.has_permission(organization_id, 'care.manage'));
create policy "care_cases scoped update" on public.care_cases
  for update to authenticated
  using (owner_id = (select auth.uid()) or public.has_permission(organization_id, 'care.manage'))
  with check (owner_id = (select auth.uid()) or public.has_permission(organization_id, 'care.manage'));
create policy "care_cases staff delete" on public.care_cases
  for delete to authenticated using (public.has_permission(organization_id, 'care.manage'));

alter table public.care_case_access enable row level security;
create policy "care_case_access scoped read" on public.care_case_access
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.has_permission((select organization_id from public.care_cases c where c.id = case_id), 'care.manage')
  );
create policy "care_case_access staff manage" on public.care_case_access
  for all to authenticated
  using (public.has_permission((select organization_id from public.care_cases c where c.id = case_id), 'care.manage'))
  with check (public.has_permission((select organization_id from public.care_cases c where c.id = case_id), 'care.manage'));

-- funds -------------------------------------------------------------------
alter table public.funds enable row level security;
create policy "funds public read" on public.funds
  for select to anon, authenticated using (is_active);
create policy "funds staff manage" on public.funds
  for all to authenticated
  using (public.has_permission(organization_id, 'giving.manage'))
  with check (public.has_permission(organization_id, 'giving.manage'));

-- donations: webhook-first — clients may only create a pending intent; ---
-- only server-side (service role, after a verified payment webhook) may
-- ever move a donation out of 'pending'.
alter table public.donations enable row level security;
create policy "donations own read" on public.donations
  for select to authenticated
  using (donor_profile_id = public.current_profile_id() or public.has_permission(organization_id, 'giving.read'));
create policy "donations create pending" on public.donations
  for insert to anon, authenticated
  with check (status = 'pending' and (donor_profile_id is null or donor_profile_id = public.current_profile_id()));
create policy "donations staff manage" on public.donations
  for update to authenticated
  using (public.has_permission(organization_id, 'giving.manage'))
  with check (public.has_permission(organization_id, 'giving.manage'));

alter table public.donation_allocations enable row level security;
create policy "donation_allocations own read" on public.donation_allocations
  for select to authenticated using (
    exists (
      select 1 from public.donations d where d.id = donation_id
        and (d.donor_profile_id = public.current_profile_id() or public.has_permission(d.organization_id, 'giving.read'))
    )
  );
create policy "donation_allocations create with donation" on public.donation_allocations
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.donations d where d.id = donation_id and d.status = 'pending'
        and (d.donor_profile_id is null or d.donor_profile_id = public.current_profile_id())
    )
  );
create policy "donation_allocations staff manage" on public.donation_allocations
  for update to authenticated
  using (exists (select 1 from public.donations d where d.id = donation_id and public.has_permission(d.organization_id, 'giving.manage')));
create policy "donation_allocations staff delete" on public.donation_allocations
  for delete to authenticated
  using (exists (select 1 from public.donations d where d.id = donation_id and public.has_permission(d.organization_id, 'giving.manage')));

-- products / variants -----------------------------------------------------
alter table public.products enable row level security;
create policy "products public read" on public.products
  for select to anon, authenticated using (status = 'active');
create policy "products staff manage" on public.products
  for all to authenticated
  using (public.has_permission(organization_id, 'shop.manage'))
  with check (public.has_permission(organization_id, 'shop.manage'));

alter table public.product_variants enable row level security;
create policy "product_variants public read" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "product_variants staff manage" on public.product_variants
  for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.has_permission(p.organization_id, 'shop.manage')))
  with check (exists (select 1 from public.products p where p.id = product_id and public.has_permission(p.organization_id, 'shop.manage')));

-- inventory_movements: internal ledger, staff-only; public sees only the --
-- aggregated variant_stock_levels view.
alter table public.inventory_movements enable row level security;
create policy "inventory_movements staff manage" on public.inventory_movements
  for all to authenticated
  using (exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and public.has_permission(p.organization_id, 'shop.manage')))
  with check (exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and public.has_permission(p.organization_id, 'shop.manage')));

grant select on public.variant_stock_levels to anon, authenticated;

-- orders / order_items: webhook-first, same pattern as donations ---------
alter table public.orders enable row level security;
create policy "orders own read" on public.orders
  for select to authenticated
  using (customer_profile_id = public.current_profile_id() or public.has_permission(organization_id, 'shop.manage'));
create policy "orders create pending" on public.orders
  for insert to anon, authenticated
  with check (status = 'pending' and (customer_profile_id is null or customer_profile_id = public.current_profile_id()));
create policy "orders staff manage" on public.orders
  for update to authenticated
  using (public.has_permission(organization_id, 'shop.manage'))
  with check (public.has_permission(organization_id, 'shop.manage'));

alter table public.order_items enable row level security;
create policy "order_items own read" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.customer_profile_id = public.current_profile_id() or public.has_permission(o.organization_id, 'shop.manage')))
  );
create policy "order_items create with order" on public.order_items
  for insert to anon, authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.status = 'pending' and (o.customer_profile_id is null or o.customer_profile_id = public.current_profile_id())));
create policy "order_items staff manage" on public.order_items
  for update to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and public.has_permission(o.organization_id, 'shop.manage')));
create policy "order_items staff delete" on public.order_items
  for delete to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and public.has_permission(o.organization_id, 'shop.manage')));

-- payments / refunds / webhook_events: staff read-only; all writes are ---
-- server-side (service role) only, matching the webhook-first design.
alter table public.payments enable row level security;
create policy "payments staff read" on public.payments
  for select to authenticated
  using (public.has_permission(organization_id, 'shop.manage') or public.has_permission(organization_id, 'giving.manage'));

alter table public.refunds enable row level security;
create policy "refunds staff read" on public.refunds
  for select to authenticated using (
    exists (select 1 from public.payments p where p.id = payment_id and (public.has_permission(p.organization_id, 'shop.manage') or public.has_permission(p.organization_id, 'giving.manage')))
  );
create policy "refunds staff create" on public.refunds
  for insert to authenticated with check (
    exists (select 1 from public.payments p where p.id = payment_id and (public.has_permission(p.organization_id, 'shop.manage') or public.has_permission(p.organization_id, 'giving.manage')))
  );

alter table public.webhook_events enable row level security;
-- intentionally no policies: service_role only.

-- digital_entitlements ----------------------------------------------------
alter table public.digital_entitlements enable row level security;
create policy "digital_entitlements own read" on public.digital_entitlements
  for select to authenticated using (
    profile_id = public.current_profile_id()
    or public.has_permission((select organization_id from public.products p where p.id = product_id), 'shop.manage')
  );
create policy "digital_entitlements staff manage" on public.digital_entitlements
  for all to authenticated
  using (public.has_permission((select organization_id from public.products p where p.id = product_id), 'shop.manage'))
  with check (public.has_permission((select organization_id from public.products p where p.id = product_id), 'shop.manage'));

-- volunteers ------------------------------------------------------------
alter table public.volunteer_opportunities enable row level security;
create policy "volunteer_opportunities public read" on public.volunteer_opportunities
  for select to anon, authenticated using (is_active);
create policy "volunteer_opportunities staff manage" on public.volunteer_opportunities
  for all to authenticated
  using (public.has_permission(organization_id, 'volunteers.manage'))
  with check (public.has_permission(organization_id, 'volunteers.manage'));

alter table public.volunteer_shifts enable row level security;
create policy "volunteer_shifts public read" on public.volunteer_shifts
  for select to anon, authenticated using (true);
create policy "volunteer_shifts staff manage" on public.volunteer_shifts
  for all to authenticated
  using (exists (select 1 from public.volunteer_opportunities o where o.id = opportunity_id and public.has_permission(o.organization_id, 'volunteers.manage')))
  with check (exists (select 1 from public.volunteer_opportunities o where o.id = opportunity_id and public.has_permission(o.organization_id, 'volunteers.manage')));

alter table public.volunteer_assignments enable row level security;
create policy "volunteer_assignments own read" on public.volunteer_assignments
  for select to authenticated using (
    profile_id = public.current_profile_id()
    or exists (select 1 from public.volunteer_shifts s join public.volunteer_opportunities o on o.id = s.opportunity_id where s.id = shift_id and public.has_permission(o.organization_id, 'volunteers.manage'))
  );
create policy "volunteer_assignments self apply" on public.volunteer_assignments
  for insert to authenticated with check (profile_id = public.current_profile_id());
create policy "volunteer_assignments own respond" on public.volunteer_assignments
  for update to authenticated
  using (profile_id = public.current_profile_id() or exists (select 1 from public.volunteer_shifts s join public.volunteer_opportunities o on o.id = s.opportunity_id where s.id = shift_id and public.has_permission(o.organization_id, 'volunteers.manage')))
  with check (profile_id = public.current_profile_id() or exists (select 1 from public.volunteer_shifts s join public.volunteer_opportunities o on o.id = s.opportunity_id where s.id = shift_id and public.has_permission(o.organization_id, 'volunteers.manage')));
create policy "volunteer_assignments staff delete" on public.volunteer_assignments
  for delete to authenticated
  using (exists (select 1 from public.volunteer_shifts s join public.volunteer_opportunities o on o.id = s.opportunity_id where s.id = shift_id and public.has_permission(o.organization_id, 'volunteers.manage')));

-- notification_preferences: strictly self-service ----------------------
alter table public.notification_preferences enable row level security;
create policy "notification_preferences own access" on public.notification_preferences
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());
