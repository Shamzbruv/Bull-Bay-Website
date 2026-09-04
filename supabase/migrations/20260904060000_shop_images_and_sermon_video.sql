-- Product photo galleries (products.image_urls already existed but had no
-- upload path) and self-hosted sermon video, as an alternative to pasting
-- a YouTube link. Delete itself needed no schema change — "staff manage"
-- policies on events/groups/products/sermons are already `for all`, which
-- covers delete; only the admin UI was missing the button.

alter table public.sermons
  drop constraint sermons_video_provider_check;
alter table public.sermons
  add constraint sermons_video_provider_check
  check (video_provider in ('youtube', 'cloudflare_stream', 'upload'));
alter table public.sermons add column if not exists video_path text;

insert into storage.buckets (id, name, public) values
  ('shop', 'shop', true),
  ('sermon-video', 'sermon-video', true)
on conflict (id) do nothing;

create policy "shop public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'shop');
create policy "shop staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'shop' and public.has_permission((select id from public.organizations limit 1), 'shop.manage'))
  with check (bucket_id = 'shop' and public.has_permission((select id from public.organizations limit 1), 'shop.manage'));

create policy "sermon-video public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'sermon-video');
create policy "sermon-video staff write" on storage.objects
  for all to authenticated
  using (bucket_id = 'sermon-video' and public.has_permission((select id from public.organizations limit 1), 'sermons.manage'))
  with check (bucket_id = 'sermon-video' and public.has_permission((select id from public.organizations limit 1), 'sermons.manage'));
