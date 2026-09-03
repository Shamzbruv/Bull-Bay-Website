-- Church photo gallery (media team) and the two remaining storage buckets:
-- a public one for gallery images, and a private one for staff assets like
-- the pastor's signature/stamp images used to certify documents.

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null,
  caption text,
  story text,
  uploaded_by uuid references auth.users(id),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index gallery_images_org_idx on public.gallery_images (organization_id, is_published, sort_order);

insert into public.permissions (code, description) values
  ('media.manage', 'Manage the photo gallery and livestream/media settings');

insert into public.role_permissions (role_id, permission_code)
select r.id, 'media.manage' from public.roles r where r.code in ('church_admin', 'content_editor');
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r cross join public.permissions p
where r.code = 'super_admin' and p.code = 'media.manage'
on conflict do nothing;

-- A dedicated role for the media team (per the conference roster) so admin
-- can grant gallery/livestream/sermon-media access without also handing
-- out broader church_admin rights.
insert into public.roles (organization_id, code, name)
select id, 'media_coordinator', 'Media Team Coordinator' from public.organizations where slug = 'bull-bay';
insert into public.role_permissions (role_id, permission_code)
select r.id, x.code from public.roles r cross join (values ('media.manage'), ('sermons.manage')) as x(code)
where r.code = 'media_coordinator';

alter table public.gallery_images enable row level security;
create policy "gallery_images public read" on public.gallery_images
  for select to anon, authenticated using (is_published);
create policy "gallery_images staff manage" on public.gallery_images
  for all to authenticated
  using (public.has_permission(organization_id, 'media.manage'))
  with check (public.has_permission(organization_id, 'media.manage'));

insert into storage.buckets (id, name, public) values
  ('gallery', 'gallery', true),
  ('staff-assets', 'staff-assets', false)
on conflict (id) do nothing;

create policy "gallery public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'gallery');
create policy "gallery staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'gallery' and public.has_permission((select id from public.organizations limit 1), 'media.manage'))
  with check (bucket_id = 'gallery' and public.has_permission((select id from public.organizations limit 1), 'media.manage'));

-- staff-assets (signatures/stamps): no public or general-authenticated
-- policy at all. Only reachable via the service-role client when
-- generating a certified PDF, and by documents.manage staff uploading
-- someone's signature/stamp image.
create policy "staff-assets manage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'staff-assets' and (
      public.has_permission((select id from public.organizations limit 1), 'documents.manage')
      or public.has_permission((select id from public.organizations limit 1), 'documents.certify')
    )
  )
  with check (
    bucket_id = 'staff-assets' and (
      public.has_permission((select id from public.organizations limit 1), 'documents.manage')
      or public.has_permission((select id from public.organizations limit 1), 'documents.certify')
    )
  );
