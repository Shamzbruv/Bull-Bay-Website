-- Storage buckets. Paid/sensitive buckets get NO anon/authenticated policy
-- at all — they're only ever reached through a server-generated short-lived
-- signed URL (service role), after the route handler has verified the
-- caller's entitlement/access in Postgres. Public buckets are readable by
-- everyone but only writable by the relevant staff permission.
--
-- Single-organization simplification: this project seeds exactly one
-- organization (0008), so staff-write policies below resolve it directly
-- rather than threading an organization_id through storage.objects.

insert into storage.buckets (id, name, public) values
  ('public-site', 'public-site', true),
  ('sermon-audio', 'sermon-audio', true),
  ('member-avatars', 'member-avatars', false),
  ('digital-products', 'digital-products', false),
  ('pastoral-attachments', 'pastoral-attachments', false),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "public-site public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'public-site');
create policy "public-site staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'public-site' and public.has_permission((select id from public.organizations limit 1), 'content.manage'))
  with check (bucket_id = 'public-site' and public.has_permission((select id from public.organizations limit 1), 'content.manage'));

create policy "sermon-audio public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'sermon-audio');
create policy "sermon-audio staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'sermon-audio' and public.has_permission((select id from public.organizations limit 1), 'sermons.manage'))
  with check (bucket_id = 'sermon-audio' and public.has_permission((select id from public.organizations limit 1), 'sermons.manage'));

-- member-avatars: each member manages files under their own auth-user-id
-- folder, e.g. member-avatars/<auth_user_id>/avatar.jpg
create policy "member-avatars own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "member-avatars own write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "member-avatars own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "member-avatars own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- digital-products / pastoral-attachments / receipts: intentionally no
-- anon/authenticated policy. Only the service-role client (server-only)
-- can read/write these, via createSignedUrl after checking entitlement.
