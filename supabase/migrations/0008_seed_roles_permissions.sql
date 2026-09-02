-- Seed the organization, its primary campus, the permission catalogue, and
-- the starting role → permission map. This is reference/config data (not
-- member data), safe to keep in versioned migrations.

insert into public.organizations (name, slug, default_currency, timezone)
values ('New Testament Church of God, Bull Bay', 'bull-bay', 'JMD', 'America/Jamaica');

insert into public.campuses (
  organization_id, slug, name, city, parish, country, is_primary, service_schedule
)
select
  o.id, 'bull-bay', 'Bull Bay', 'Bull Bay', 'St. Andrew', 'Jamaica', true,
  '[
    {"day": "Sunday", "time": "9:50 AM", "label": "Sunday Worship Service"},
    {"day": "Wednesday", "time": "9:00 AM", "label": "Prayer & Fasting"},
    {"day": "Friday", "time": "4:30 PM", "label": "Teens Fellowship"}
  ]'::jsonb
from public.organizations o where o.slug = 'bull-bay';

insert into public.permissions (code, description) values
  ('people.read', 'View member/visitor directory and profiles'),
  ('people.write', 'Create and edit member/visitor records and households'),
  ('events.manage', 'Create, edit and manage events and registrations'),
  ('groups.manage', 'Create, edit and manage small groups'),
  ('volunteers.manage', 'Manage volunteer opportunities, shifts and assignments'),
  ('sermons.manage', 'Publish and edit sermons and sermon series'),
  ('content.manage', 'Edit public pages, ministries and announcements'),
  ('communications.send', 'Send communications/campaigns to congregation segments'),
  ('giving.read', 'View donation and fund records'),
  ('giving.manage', 'Manage funds, donation status and giving reconciliation'),
  ('shop.manage', 'Manage products, inventory, orders and fulfillment'),
  ('refunds.approve', 'Issue refunds on orders or donations'),
  ('reports.read', 'View operational and ministry reports'),
  ('care.read', 'View non-confidential pastoral care summaries'),
  ('care.manage', 'Full pastoral care case access and management'),
  ('roles.manage', 'Manage roles, permissions, staff invitations and audit log'),
  ('sites.manage', 'Manage organization and campus configuration'),
  ('integrations.manage', 'Manage third-party integrations and webhooks');

insert into public.roles (organization_id, code, name)
select o.id, r.code, r.name
from public.organizations o
cross join (values
  ('super_admin', 'Super Administrator'),
  ('church_admin', 'Church Administrator'),
  ('pastor', 'Pastor / Clergy'),
  ('finance_officer', 'Finance Officer'),
  ('content_editor', 'Content Editor'),
  ('store_manager', 'Store Manager'),
  ('volunteer_coordinator', 'Volunteer Coordinator'),
  ('group_leader', 'Group / Ministry Leader')
) as r(code, name)
where o.slug = 'bull-bay';

-- super_admin: every permission
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'super_admin';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('people.read'), ('people.write'), ('events.manage'), ('groups.manage'),
  ('volunteers.manage'), ('sermons.manage'), ('content.manage'),
  ('communications.send'), ('reports.read'), ('sites.manage')
) as x(code) where r.code = 'church_admin';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('care.read'), ('care.manage'), ('sermons.manage'), ('reports.read'), ('people.read')
) as x(code) where r.code = 'pastor';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('giving.read'), ('giving.manage'), ('refunds.approve'), ('reports.read')
) as x(code) where r.code = 'finance_officer';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('content.manage'), ('sermons.manage')
) as x(code) where r.code = 'content_editor';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('shop.manage'), ('refunds.approve')
) as x(code) where r.code = 'store_manager';

insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values
  ('volunteers.manage')
) as x(code) where r.code = 'volunteer_coordinator';

-- group_leader intentionally has no global permissions: leader access is
-- scoped per-group through group_members.role, checked directly in RLS
-- (see 0007), not through the org-wide permission system.
