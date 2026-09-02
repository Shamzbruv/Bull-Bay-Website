-- Confirmed-date activities from the annual plan (slides 48-50), imported
-- as draft events — never published sight-unseen. A staff member must still
-- review/confirm exact time, location, visibility and registration rules
-- before publishing each one (see docs/CONFERENCE_IMPORT.md).
with org as (select id from public.organizations where slug = 'bull-bay'),
     campus as (select id from public.campuses where slug = 'bull-bay')
insert into public.events (organization_id, campus_id, slug, title, category, description, starts_at, ends_at, status, visibility)
select org.id, campus.id, v.slug, v.title, v.category, v.description, v.starts_at::timestamptz, v.ends_at::timestamptz, 'draft', 'public'
from org, campus, (values
  ('church-year-launch', 'Church Year Launch', 'Leadership', 'The New Testament Church of God, Bull Bay 2026-2027 church year begins.', '2026-09-01 09:00:00-05', null),
  ('installation-sunday', 'Installation Sunday', 'Leadership', 'Leadership orientation and commissioning for the new church year.', '2026-09-06 09:50:00-05', null),
  ('national-heroes-day', 'National Heroes'' Day', 'Community Outreach', 'Jamaica National Heroes'' Day.', '2026-10-19 09:00:00-05', null),
  ('stewardship-sunday', 'Stewardship Sunday', 'Stewardship', 'A service dedicated to faithful stewardship, closing Stewardship Month.', '2026-10-25 09:50:00-05', null),
  ('district-mission-service', 'District Mission Service', 'Missions', null, '2026-11-29 09:00:00-05', null),
  ('christmas-in-the-yard', 'Christmas in the Yard', 'Family', null, '2026-12-18 18:00:00-05', null),
  ('christmas-sunday', 'Recital & Christmas Sunday', 'Worship', null, '2026-12-20 09:50:00-05', null),
  ('christmas-day-service', 'Christmas Day Service', 'Worship', null, '2026-12-25 09:00:00-05', null),
  ('watch-night-dawn-concert', 'Watch Night & Dawn Concert', 'Worship', null, '2026-12-31 22:00:00-05', '2027-01-01 06:00:00-05'),
  ('new-years-sunday', 'New Year''s Sunday', 'Worship', null, '2027-01-03 09:50:00-05', null),
  ('21-days-of-prayer-and-fasting', '21 Days of Prayer & Fasting', 'Prayer & Fasting', 'Includes an absolute fasting weekend and a leadership prayer retreat.', '2027-01-05 06:00:00-05', '2027-01-24 21:00:00-05'),
  ('evangelistic-crusade', 'Evangelistic Crusade', 'Missions', null, '2027-01-10 19:00:00-05', '2027-01-29 21:00:00-05'),
  ('district-fast-lent-begins', 'District Fast / Lent Begins', 'Prayer & Fasting', null, '2027-02-10 09:00:00-05', null),
  ('celebrating-jesus-week', 'Celebrating Jesus Week', 'Worship', 'Includes Holy Week prayer services.', '2027-03-21 09:00:00-05', '2027-03-26 21:00:00-05'),
  ('resurrection-sunday', 'Resurrection Sunday', 'Worship', 'Includes a baptismal service and new members'' orientation.', '2027-03-28 09:50:00-05', null),
  ('mothers-day-service', 'Mother''s Day Service', 'Family', null, '2027-05-09 09:50:00-05', null),
  ('teachers-day-recognition', 'Teachers'' Day Recognition', 'Christian Education', null, '2027-05-12 09:50:00-05', null),
  ('pentecostal-week', 'Pentecostal Week', 'Worship', 'Includes a conference, fellowship and prayer breakfast.', '2027-05-16 09:00:00-05', '2027-05-21 21:00:00-05'),
  ('community-project-may', 'Community Project', 'Community Outreach', null, '2027-05-24 09:00:00-05', null),
  ('family-week', 'Family Week', 'Family', 'Includes Family Fun Day, the Couples'' Banquet and a parenting seminar.', '2027-06-13 09:00:00-05', '2027-06-19 21:00:00-05'),
  ('national-convention', 'National Convention', 'Leadership', 'Includes Children''s, Teens'' and Youth Camps and Vacation Bible School.', '2027-07-09 09:00:00-05', '2027-07-11 21:00:00-05')
) as v(slug, title, category, description, starts_at, ends_at);

-- Month-only annual plan actions (no confirmed day) — internal planning list
-- only. Staff promote an item to a real event once it has an exact date.
with org as (select id from public.organizations where slug = 'bull-bay'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.annual_plan_items (organization_id, church_year_id, title, description, category, month, status, visibility)
select org.id, cy.id, v.title, v.description, v.category, v.month, 'planned', 'internal'
from org, cy, (values
  ('Leadership orientation & commissioning', null, 'Leadership', 'September'),
  ('Department planning', null, 'Leadership', 'September'),
  ('Ministry programme launch', null, 'Leadership', 'September'),
  ('Stewardship Month activities', 'Month-long stewardship emphasis alongside Stewardship Sunday.', 'Stewardship', 'October'),
  ('Stewardship seminar', null, 'Stewardship', 'October'),
  ('Financial literacy workshop', null, 'Stewardship', 'October'),
  ('Mission & Men''s Month activities', null, 'Missions', 'November'),
  ('Men''s fellowship breakfast', null, 'Men''s', 'November'),
  ('Community outreach initiative', null, 'Community Outreach', 'November'),
  ('Absolute fasting weekend', 'Within the 21 Days of Prayer & Fasting.', 'Prayer & Fasting', 'January'),
  ('Leadership prayer retreat', 'Within the 21 Days of Prayer & Fasting.', 'Leadership', 'January'),
  ('Sunday School Month activities', null, 'Christian Education', 'February'),
  ('Sunday School seminar', null, 'Christian Education', 'February'),
  ('Teachers'' training', null, 'Christian Education', 'February'),
  ('Children''s ministry workshop', null, 'Children', 'February'),
  ('Holy Week prayer services', null, 'Prayer & Fasting', 'March'),
  ('Baptismal service', null, 'Worship', 'March'),
  ('New members'' orientation', null, 'Christian Education', 'March'),
  ('Youth Month activities', null, 'Youth', 'April'),
  ('Youth rally', null, 'Youth', 'April'),
  ('Children''s Ministry Day', null, 'Children', 'April'),
  ('Youth evangelism outreach', null, 'Youth', 'April'),
  ('Leadership development session', null, 'Leadership', 'April'),
  ('Conference, fellowship & prayer breakfast', null, 'Women''s', 'May'),
  ('Family Fun Day', null, 'Family', 'June'),
  ('Couples'' Banquet', null, 'Family', 'June'),
  ('Parenting seminar', null, 'Family', 'June'),
  ('Children''s, Teens'' and Youth Camps', null, 'Youth', 'July'),
  ('Vacation Bible School', null, 'Children', 'July'),
  ('Community evangelism', null, 'Missions', 'July'),
  ('Mid-year ministry review', null, 'Leadership', 'July'),
  ('Annual ministry reports', null, 'Leadership', 'August'),
  ('Ministry planning sessions', null, 'Leadership', 'August'),
  ('Leadership retreat & strategic review', null, 'Leadership', 'August'),
  ('Consecration for the new church year', null, 'Worship', 'August')
) as v(title, description, category, month);
