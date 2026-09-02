-- Seed the 2026-2027 church year, the seven strategic movements with their
-- objectives/outcomes, SMART goals, and the 14-point Declaration of Faith.
-- Exact wording preserved from the approved conference deck (slides 3-17).

insert into public.church_years (organization_id, label, starts_on, ends_on, status)
select id, '2026-2027', '2026-09-01', '2027-08-31', 'active'
from public.organizations where slug = 'bull-bay';

with cy as (select id from public.church_years where label = '2026-2027')
insert into public.strategic_movements (church_year_id, slug, name, short_label, description, objective, expected_outcome, sort_order, public_visible)
select cy.id, v.slug, v.name, v.short_label, v.description, v.objective, v.outcome, v.sort_order, true from cy, (values
  ('welcome', 'Welcome', 'Belonging', 'Ambiance, Hospitality & Fellowship', 'To foster a positive ambiance and a culture of hospitality and belonging where persons feel valued, connected, and supported.', 'Increased membership retention, spiritual growth, and stronger fellowship among congregants and among members.', 1),
  ('worship', 'Worship', 'Exalting God', 'Exalting God Together', 'To deepen personal and corporate worship through Spirit-led, Christ centred expressions of worship, praise and thanksgiving.', 'A vibrant worship culture where all generations experience God’s presence and participate actively in worship. Learning new songs regularly.', 2),
  ('word', 'Word', 'Teaching & discipleship', 'Teaching, Preaching & Discipleship', 'To build strong biblical foundations through systematic teaching, preaching and disciple-making that leads to maturity and ministry involvement.', 'A biblically grounded congregation that demonstrates sound doctrine, maturity, and active engagement in ministry.', 3),
  ('walk', 'Walk', 'Christian living', 'Christian Living & Stewardship', 'To model godly Kingdom living and faithful stewardship in every aspect of life, promoting integrity, service, and generosity.', 'A congregation known for Christlike character, faithful stewardship, and excellence in life and ministry participation.', 4),
  ('watch', 'Watch', 'Prayer & vigilance', 'Prayer & Spiritual Vigilance', 'To strengthen the prayer life of the believers through biblical, intentional and strategic praying, intercession, fasting, and spiritual vigilance.', 'A praying church that experiences divine breakthroughs, unity, and revival.', 5),
  ('witness', 'Witness', 'Evangelism & missions', 'Evangelism & Missions', 'To fulfil the Great Commission through intentional evangelism, missions, and community outreach.', 'An outward-focused church that engages relatives, friends, coworkers, and its communities with the Gospel of Christ.', 6),
  ('wholeness', 'Wholeness', 'Family & holistic care', 'Family, Healing & Holistic Care', 'To promote physical, emotional, mental, and spiritual well-being through holistic care ministries.', 'A compassionate church that demonstrates the healing love of Christ and strengthens families and individuals in need through balanced and wholistic ministry.', 7)
) as v(slug, name, short_label, description, objective, outcome, sort_order);

-- SMART goals, one row per distinct measurable statement, exact deck wording.
-- Default public_visible = false per the brief: raw KPI targets are shown
-- publicly only once an administrator explicitly marks a goal public.
insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('90% of baptized believers retain through to 2026–2027.', 1)
) as g(goal_text, sort_order)
where sm.slug = 'welcome' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('At least 2 new musicians and instruments infused to enhance worship by 2027.', 1)
) as g(goal_text, sort_order)
where sm.slug = 'worship' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('Preach and teach at least 8 times monthly.', 1),
  ('Lay leaders (at least 5) teaching Sunday School and preaching.', 2)
) as g(goal_text, sort_order)
where sm.slug = 'word' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('60% of all new believers baptized in the HOLY GHOST.', 1),
  ('Giving to those in school and the indigent weekly.', 2)
) as g(goal_text, sort_order)
where sm.slug = 'walk' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('Twelve times (12) of corporate prayer monthly.', 1),
  ('Three (3) children to be incorporated in prayer meetings monthly.', 2)
) as g(goal_text, sort_order)
where sm.slug = 'watch' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('Ten (10) males getting saved and baptized yearly.', 1)
) as g(goal_text, sort_order)
where sm.slug = 'witness' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

insert into public.strategic_goals (strategic_movement_id, goal_text, status, public_visible, sort_order)
select sm.id, g.goal_text, 'not_started', false, g.sort_order
from public.strategic_movements sm, (values
  ('Winning and mentoring 2 families for the year.', 1),
  ('At least 2 marriages yearly.', 2),
  ('Re-start Singles Ministry.', 3)
) as g(goal_text, sort_order)
where sm.slug = 'wholeness' and sm.church_year_id = (select id from public.church_years where label = '2026-2027');

-- Declaration of Faith: all 14 statements, exact order, published immediately
-- since this doctrine content is already church-approved (slides 16-17).
insert into public.doctrine_statements (organization_id, ordinal, statement, status)
select o.id, d.ordinal, d.statement, 'published'
from public.organizations o, (values
  (1, 'The verbal inspiration of the Bible'),
  (2, 'One God eternally existing as Father, Son and Holy Ghost'),
  (3, 'Jesus Christ—His incarnation, death, resurrection, ascension and intercession'),
  (4, 'Human sin and the necessity of repentance'),
  (5, 'Justification, regeneration and new birth through faith in Christ’s blood'),
  (6, 'Sanctification through Christ’s blood, the Word and the Holy Ghost'),
  (7, 'Holiness as God’s standard of living for His people'),
  (8, 'Baptism with the Holy Ghost subsequent to a clean heart'),
  (9, 'Speaking with other tongues as the Spirit gives utterance—the initial evidence of Spirit baptism'),
  (10, 'Water baptism by immersion for all who repent'),
  (11, 'Divine healing provided in the atonement'),
  (12, 'The Lord’s Supper and washing of the saints’ feet'),
  (13, 'The premillennial second coming of Jesus Christ'),
  (14, 'Bodily resurrection, eternal life for the righteous and eternal punishment for the wicked')
) as d(ordinal, statement)
where o.slug = 'bull-bay';
