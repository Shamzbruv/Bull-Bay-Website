-- Seeds the same real (non-placeholder) content the previous static site
-- shipped with, so the rebuilt platform launches with real sermons, events,
-- ministries, funds and shop items instead of an empty database. All of
-- this remains editable by staff through the admin/pastor workspaces.

with org as (select id from public.organizations where slug = 'bull-bay')
insert into public.sermons (organization_id, slug, title, speaker, topics, preached_at, duration_seconds, status, published_at)
select org.id, v.slug, v.title, v.speaker, array[v.topic], v.preached_at::date, 2520, 'published', now()
from org, (values
  ('faith-that-stands-when-life-shakes', 'Faith that stands when life shakes', 'Rev. Doc. Kevin Page', 'faith', '2026-08-30'),
  ('when-prayer-becomes-your-first-response', 'When prayer becomes your first response', 'Bull Bay Prayer Team', 'prayer', '2026-08-23'),
  ('created-for-a-purpose-greater-than-fear', 'Created for a purpose greater than fear', 'Rev. Doc. Kevin Page', 'purpose', '2026-08-16'),
  ('grace-for-the-next-step', 'Grace for the next step', 'Guest Minister', 'faith', '2026-08-09'),
  ('a-house-of-worship', 'A house of worship', 'Rev. Doc. Kevin Page', 'prayer', '2026-08-02'),
  ('use-what-god-placed-in-your-hands', 'Use what God placed in your hands', 'Bull Bay Leadership', 'purpose', '2026-07-26')
) as v(slug, title, speaker, topic, preached_at);

with org as (select id from public.organizations where slug = 'bull-bay'),
     campus as (select id from public.campuses where slug = 'bull-bay')
insert into public.events (organization_id, campus_id, slug, title, category, description, starts_at, status, visibility)
select org.id, campus.id, v.slug, v.title, v.category, v.description, v.starts_at::timestamptz, 'published', 'public'
from org, campus, (values
  ('prayer-and-fasting-in-the-sanctuary', 'Prayer and Fasting in the Sanctuary', 'PRAYER & FASTING', 'Wednesday • 9:00 AM • Sanctuary', '2026-09-09 09:00:00-05'),
  ('spring-garden-rally', 'Spring Garden Rally', 'CHURCH FAMILY', 'Friday • 7:00 PM • Men are invited to represent Bull Bay', '2026-09-04 19:00:00-05'),
  ('send-off-service-for-rev-markland-and-family', 'Send-Off Service for Rev. Markland & Family', 'SPECIAL SERVICE', 'Sunday • 9:50 AM • Worship with us as we celebrate their next season', '2026-09-06 09:50:00-05'),
  ('teens-fellowship', 'Teens Fellowship', 'YOUTH MINISTRY', 'Friday • 4:30 PM • A space for teens to grow and connect', '2026-09-11 16:30:00-05')
) as v(slug, title, category, description, starts_at);

with org as (select id from public.organizations where slug = 'bull-bay')
insert into public.ministries (organization_id, slug, name, description, icon, sort_order)
select org.id, v.slug, v.name, v.description, v.icon, v.sort_order
from org, (values
  ('worship-music', 'Worship & Music', 'Lead people into God''s presence through worship.', '♫', 0),
  ('youth-ministry', 'Youth Ministry', 'A faith-filled community for the next generation.', '✦', 1),
  ('childrens-ministry', 'Children''s Ministry', 'Helping children discover the love of Jesus.', '♡', 2),
  ('mens-ministry', 'Men''s Ministry', 'Growing strong men of faith, family and purpose.', '⌁', 3),
  ('womens-ministry', 'Women''s Ministry', 'Encouraging women to flourish in every season.', '❋', 4),
  ('community-outreach', 'Community Outreach', 'Serving Bull Bay with practical love and hope.', '☀', 5)
) as v(slug, name, description, icon, sort_order);

with org as (select id from public.organizations where slug = 'bull-bay')
insert into public.funds (organization_id, code, name)
select org.id, v.code, v.name
from org, (values
  ('tithes', 'Tithes & Offering'),
  ('missions', 'Missions'),
  ('building', 'Building Fund'),
  ('youth', 'Youth Ministry'),
  ('outreach', 'Community Outreach')
) as v(code, name);

with org as (select id from public.organizations where slug = 'bull-bay'),
     inserted_products as (
  insert into public.products (organization_id, slug, name, description, kind, status, price_minor)
  select org.id, v.slug, v.name, v.description, v.kind, 'active', v.price_minor
  from org, (values
    ('bull-bay-heritage-tee', 'Bull Bay Heritage Tee', 'Comfortable ministry apparel', 'physical', 250000),
    ('the-word-still-speaks', 'The Word Still Speaks', 'Sermon notes and study guide', 'physical', 85000),
    ('daily-grace-devotional', 'Daily Grace Devotional', '30-day digital devotional', 'digital', 120000),
    ('faith-over-fear-tee', 'Faith Over Fear Tee', 'Unisex church apparel', 'physical', 250000),
    ('family-prayer-journal', 'Family Prayer Journal', 'Guided journal for home devotion', 'physical', 150000),
    ('bible-study-toolkit', 'Bible Study Toolkit', 'Downloadable discipleship resources', 'digital', 180000)
  ) as v(slug, name, description, kind, price_minor)
  returning id, slug, kind
),
inserted_variants as (
  insert into public.product_variants (product_id, sku, name, track_inventory)
  select p.id, upper(replace(p.slug, '-', '_')) || '-DEFAULT', 'Default', (p.kind = 'physical')
  from inserted_products p
  returning id, sku, product_id
)
insert into public.inventory_movements (variant_id, quantity_delta, reason)
select v.id, 24, 'initial_stock'
from inserted_variants v
join inserted_products p on p.id = v.product_id
where p.kind = 'physical';
