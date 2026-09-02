-- Private member/staff document library. Home for the Church Members
-- Conference deck/PDF and any future internal documents — never the
-- public-site bucket, and no anonymous policy at all.

insert into storage.buckets (id, name, public) values
  ('member-resources', 'member-resources', false)
on conflict (id) do nothing;

create policy "member-resources authenticated read" on storage.objects
  for select to authenticated using (bucket_id = 'member-resources');

create policy "member-resources staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'member-resources' and public.has_permission((select id from public.organizations limit 1), 'direction.manage'))
  with check (bucket_id = 'member-resources' and public.has_permission((select id from public.organizations limit 1), 'direction.manage'));
