-- Ensure every ministry named in the conference deck (slides 19-47) exists
-- as a ministries row, preserving existing slugs/URLs where a ministry was
-- already seeded. Two are intentionally is_active = false: Administrative
-- Team and Church Cleaning are internal support functions, not something a
-- visitor "joins" — they still need a ministries row so their roster rows
-- have a valid ministry_id, but public.ministries RLS already hides
-- inactive rows from the public /ministries listing.

-- Reuse the existing "community-outreach" slug/URL for the deck's
-- "Evangelism, Discipleship & Mission" ministry rather than creating a
-- duplicate.
update public.ministries
set name = 'Evangelism, Discipleship & Mission',
    description = 'Fulfilling the Great Commission through intentional evangelism, missions and community outreach.'
where slug = 'community-outreach';

with org as (select id from public.organizations where slug = 'bull-bay')
insert into public.ministries (organization_id, slug, name, description, is_active, sort_order)
select org.id, v.slug, v.name, v.description, v.is_active, v.sort_order
from org, (values
  ('pastoral-care', 'Pastoral Care', 'Supporting the pastoral team in caring for members through visitation and follow-up.', true, 10),
  ('hospitality', 'Hospitality', 'Creating a warm welcome for every visitor and member on arrival.', true, 11),
  ('teens-ministry', 'Teens Ministry', 'Discipleship and fellowship for our teenage members.', true, 12),
  ('young-adults-ministry', 'Young Adult Ministry', 'Community and growth for young adults.', true, 13),
  ('tertiary-ministry', 'Tertiary Ministry', 'Supporting members in college and university.', true, 14),
  ('sunday-school', 'Sunday School', 'Bible-centred Christian education for every age group.', true, 15),
  ('sports-ministry', 'Sports Ministry', 'Building community and outreach through sport.', true, 16),
  ('family-life-ministry', 'Family Life Ministry', 'Strengthening families through teaching and support.', true, 17),
  ('couples-ministry', 'Couples Ministry', 'Encouraging and equipping married couples.', true, 18),
  ('senior-citizens-ministry', 'Senior Citizens Ministry', 'Honouring and caring for our senior members.', true, 19),
  ('prayer-fasting-ministry', 'Prayer & Fasting', 'Leading the church in sustained corporate prayer and fasting.', true, 20),
  ('sacraments-ministry', 'Sacraments', 'Coordinating communion and other church ordinances.', true, 21),
  ('benevolence-ministry', 'Benevolence Ministry', 'Practical, compassionate support for members and neighbours in need.', true, 22),
  ('ushers-ministry', 'Ushers', 'Serving the congregation with order and hospitality during services.', true, 23),
  ('media-ministry', 'Media Ministry', 'Sound, livestream and technical production for every service.', true, 24),
  ('administrative-team', 'Administrative Team', 'Internal church administrative support.', false, 90),
  ('church-cleaning', 'Church Cleaning', 'Internal facilities/cleaning rota.', false, 91)
) as v(slug, name, description, is_active, sort_order)
on conflict (organization_id, slug) do nothing;
