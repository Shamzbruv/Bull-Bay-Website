-- The pastoral secretary team already keeps the Bulletin, attendance,
-- documents, and communications current (content.manage,
-- attendance.submit, documents.manage) — extend that to Church Direction
-- ("Seven movements. One mission" on the homepage, and the Conference
-- document) so the vision/priorities can be kept current by someone on
-- staff whenever it changes, not only the pastor or a super_admin. The
-- admin screens and homepage already read live from these tables — this
-- is purely a permission grant, no other change needed.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'direction.manage'
from public.roles r
where r.code = 'secretary'
on conflict do nothing;
