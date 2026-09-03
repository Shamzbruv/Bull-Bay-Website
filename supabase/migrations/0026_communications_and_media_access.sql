-- Let the media team update the livestream link without needing full
-- sites.manage (which also covers business hours, address, phone, etc.).
drop policy if exists "campuses staff manage" on public.campuses;
create policy "campuses staff manage" on public.campuses
  for all to authenticated
  using (public.has_permission(organization_id, 'sites.manage') or public.has_permission(organization_id, 'media.manage'))
  with check (public.has_permission(organization_id, 'sites.manage') or public.has_permission(organization_id, 'media.manage'));

-- Admin -> Communications: 'communications.send' already exists (0008,
-- granted to church_admin + super_admin there) — extend it to the pastor
-- and the pastor's office secretary team.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'communications.send' from public.roles r where r.code in ('pastor', 'secretary')
on conflict do nothing;
