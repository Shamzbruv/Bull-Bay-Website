-- Ministry worker roster import from the 2026-2027 Church Members
-- Conference deck (slides 19-47). Every row is public_visible = false and
-- profile_id is left null by design: the brief requires staff review before
-- connecting any imported row to a real profiles.id, and a full roster must
-- never be exposed publicly. See docs/CONFERENCE_RECONCILIATION.md for the
-- specific rows flagged for human confirmation.

with mn as (select id from public.ministries where slug = 'pastoral-care'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Liaison Officer', 'Adrian Palmer', 1),
  ('Member', 'Sandra Reid', 2),
  ('Member', 'Phiona Palmer', 3),
  ('Member', 'Carlyle Reid', 4),
  ('Member', 'Kareen Hamilton', 5),
  ('Member', 'Shelly-Ann Hall', 6),
  ('Member', 'Veneshia Williams', 7)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'administrative-team'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Executive Assistant', 'Jessica Sewell', 1),
  ('Admin Assistant', 'Pennola Williams', 2),
  ('Admin Assistant', 'Jamelia Peart', 3)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'hospitality'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Member', 'Sandra Reid', 1),
  ('Member', 'Davoy Palmer', 2),
  ('Member', 'Muriel Lewis', 3),
  ('Member', 'Rosie Scarlett', 4),
  ('Member', 'Malvia Muir', 5)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'youth-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Liaison Officer', 'Mattase Sewell-Brown', 1),
  ('Director', 'Dawn Turner', 2),
  ('Assist Director', 'Marsha Moore-Brown', 3),
  ('Assist Director', 'Davoy Palmer', 4),
  ('Secretary', 'Shantel Palmer', 5),
  ('Assist Secretary', 'Kimaya Brown', 6),
  ('Assist Secretary', 'Tanoya Thomas', 7),
  ('PRO', 'Shamar Baker', 8),
  ('Assist PRO', 'Jaheim Jarrett', 9)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'childrens-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Avery Pryce', 1),
  ('Assist Director', 'Kerry-Kay Holmes', 2),
  ('Secretary', 'Dajaunea Palmer', 3),
  ('Assist Secretary', 'Leijauna Muir', 4),
  ('Member', 'Psani Bramwell', 5),
  ('Member', 'Natoya Broomfield', 6),
  ('Dance Choreographer', 'Niveah Hinds', 7)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'sacraments-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Member', 'Mattase Sewell-Brown', 1),
  ('Member', 'Phiona Palmer', 2),
  ('Member', 'Nadine Darby', 3)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'teens-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Liaison Officer', 'Mattase Sewell-Brown', 1),
  ('Director', 'Trina Soutar', 2),
  ('Assist Director', 'Shantel Palmer', 3),
  ('Assist Director', 'Mattase Sewell-Brown', 4),
  ('Secretary', 'Kimaya Brown', 5),
  ('Assist Secretary', 'Joel Clarke', 6),
  ('Treasurer', 'Dajaunea Palmer', 7),
  ('Treasurer', 'Chelsea Hillary', 8),
  ('PRO', 'Adriano Hinds', 9),
  ('Dance Choreographer', 'Niveah Hinds', 10)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'young-adults-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Janelle Palmer', 1),
  ('Assist Director', 'Shamar Baker', 2),
  ('Secretary', 'Jamelia Peart', 3),
  ('Assist Secretary', 'Ryando Ford', 4),
  ('Treasurer', 'Camilla Smiley', 5),
  ('PRO', 'Shamar Baker', 6),
  ('Member', 'Shameka Williams', 7)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'tertiary-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Shantel Palmer', 1),
  ('Assist Director', 'Trina Muir Soutar', 2),
  ('Secretary', 'Jamelia Peart', 3),
  ('Assist Secretary', 'Amelia O’gilvie', 4)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'sunday-school'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Superintendent', 'Sheryl Appleton', 1),
  ('Assist Superintendent', 'Bishop Leroy Muir', 2),
  ('Assist Superintendent', 'Mattase Sewell-Brown', 3),
  ('Secretary', 'Trina Muir', 4),
  ('Assist Secretary', 'Cristal Green', 5),
  ('Nursery Class Teacher', 'Kerry-Kay Holmes', 6),
  ('Nursery Class Teacher', 'Nastassia Allen', 7),
  ('Primary Boys & Girls Class Teacher', 'Melisa French', 8),
  ('Primary Boys & Girls Class Teacher', 'Alphea Reid', 9),
  ('Junior Boys & Girls Class Teacher', 'Carmeta Cole', 10),
  ('Junior Boys & Girls Class Teacher', 'Camilla Smiley', 11),
  ('Junior High Boys & Girls Class Teacher', 'Avery Pryce', 12),
  ('Junior High Boys & Girls Class Teacher', 'Shameka Williams', 13),
  ('Senior High Boys & Girls Class Teacher', 'Janelle Palmer', 14),
  ('Senior High Boys & Girls Class Teacher', 'Shantel Palmer', 15),
  ('Young Adult Class Teacher', 'Dawn Turner', 16),
  ('Young Adult Class Teacher', 'Jerome Vassell', 17),
  ('Senior Adult Class Teacher', 'Sharon Moore', 18),
  ('Senior Adult Class Teacher', 'Nadine Muir', 19),
  ('Young Converts Class Teacher', 'Leighton Muir', 20),
  ('Young Converts Class Teacher', 'Rosie Scarlett', 21),
  ('Satellite Sunday School Teacher', 'Avery Pryce', 22),
  ('Satellite Sunday School Teacher', 'Kerry-Kay Holmes', 23),
  ('Satellite Sunday School Teacher', 'Phiona Palmer', 24),
  ('Satellite Sunday School Teacher', 'Mattase Sewell-Brown', 25),
  ('Satellite Sunday School Teacher', 'Nastassia Allen', 26),
  ('Satellite Sunday School Teacher', 'Timon Appleton', 27),
  ('Refreshment Officer', 'Jillian Hinds', 28),
  ('Refreshment Officer', 'Phiona Palmer', 29),
  ('Refreshment Officer', 'Malvia Muir', 30),
  ('Refreshment Officer', 'Dorrell Ebanks', 31),
  ('Refreshment Officer', 'Nadine Darby-Scott', 32)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'sports-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Davoy Palmer', 1),
  ('Member', 'Avery Pryce', 2),
  ('Member', 'Jaheim Jarrett', 3),
  ('Member', 'Leijauna Muir', 4),
  ('Member', 'Stephen Dodd', 5),
  ('Member', 'Rejanique Markland', 6),
  ('PRO/Secretary', 'Shantel Palmer', 7)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'mens-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Timon Appleton', 1),
  ('Assist Director', 'Davoy Palmer', 2),
  ('Assist Director', 'Stephen Dodd', 3),
  ('Secretary', 'Damion Holding', 4),
  ('Assist Secretary', 'Nicholas Hall', 5),
  ('Treasurer', 'Dane Palmer', 6),
  ('Assist Treasurer', 'Ryando Ford', 7),
  ('PRO', 'Shamar Baker', 8),
  ('Assist PRO', 'Jevaughni McLennon', 9),
  ('Assist PRO', 'Jaheim Jarrett', 10),
  ('Assist PRO', 'Adriano Irons', 11)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'womens-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('District President', 'Racquel Philburn Page', 1),
  ('Director', 'Sandra Campbell Reid', 2),
  ('Assistant Director', 'Nichola Donaldson', 3),
  ('Secretary', 'Veneshia Williams', 4),
  ('Treasurer', 'Michell Kelly', 5)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'church-cleaning'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('1st Sunday Cleaning Team', 'Etta Brown', 1),
  ('1st Sunday Cleaning Team', 'Kareen Hamilton', 2),
  ('2nd Sunday Cleaning Team', 'Sandra Reid', 3),
  ('3rd Sunday Cleaning Team', 'Youth Department', 4),
  ('4th Sunday Cleaning Team', 'Veneshia Williams', 5),
  ('4th Sunday Cleaning Team', 'Men', 6)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'family-life-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Jessica Sewell', 1),
  ('Assist Director', 'Mattase Sewell-Brown', 2),
  ('Secretary', 'Kerry Wallace', 3)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'couples-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Sandra Campbell-Reid', 1),
  ('Director', 'Carlilie Reid', 2),
  ('Assist Director', 'Dorenzo Palmer', 3),
  ('Assist Director', 'Janelle Palmer', 4),
  ('Secretary', 'Davoy Palmer', 5),
  ('Secretary', 'Shantel Palmer', 6),
  ('Assist Secretary', 'Daine Palmer', 7),
  ('Assist Secretary', 'Tiffany Palmer', 8),
  ('PRO', 'Shamar Baker', 9),
  ('PRO', 'Holana Baker', 10)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'senior-citizens-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Director', 'Trina Muir Soutar', 1),
  ('Assist Director', 'Mattase Sewell-Brown', 2)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'prayer-fasting-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Team Leader', 'Rosie Scarlett', 1),
  ('Assist Team Leader', 'Sharon Moore', 2),
  ('Team Member', 'Phiona Palmer', 3),
  ('Team Member', 'Kemar White', 4),
  ('Team Member', 'Carlene Wallace', 5),
  ('Team Member', 'Avery Pryce', 6),
  ('Team Member', 'Damion Holding', 7),
  ('Team Member', 'Lorna Whittle', 8),
  ('Team Member', 'Lorna Hewitt', 9),
  ('Team Member', 'David Williams', 10),
  ('Team Member', 'Muriel Lewis', 11),
  ('Team Member', 'Anita Reid', 12),
  ('Team Member', 'Jaheim Jarrett', 13),
  ('Team Member', 'Etta Brown', 14),
  ('Team Member', 'Sandra Campbell Reid', 15),
  ('Team Member', 'Angela Brown', 16),
  ('Team Member', 'Jillian Hinds', 17),
  ('Team Member', 'Amelia O’lgivie', 18),
  ('Team Member', 'Phyllis Gentles', 19),
  ('Team Member', 'Mattase Sewell-Brown', 20)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'community-outreach'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Team Leader', 'Timon Appleton', 1),
  ('Team Member', 'Kemar White', 2),
  ('Team Member', 'Leighton Muir', 3),
  ('Team Member', 'Sylvan Scarlett', 4),
  ('Team Member', 'Rosie Scarlett', 5),
  ('Team Member', 'Carlene Wallace', 6),
  ('Team Member', 'Sharon Moore', 7),
  ('Team Member', 'Phiona Palmer', 8),
  ('Team Member', 'Kerry Wallace', 9),
  ('Team Member', 'Avery Pryce', 10),
  ('Team Member', 'Sandra Campbell-Reid', 11),
  ('Team Member', 'Daine Palmer', 12),
  ('Team Member', 'Camilla Smiley', 13),
  ('Team Member', 'Garion Holding', 14)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'benevolence-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Team Leader', 'Mattase Sewell-Brown', 1),
  ('Team Member', 'Davoy Palmer', 2),
  ('Team Member', 'Phiona Palmer', 3)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'worship-music'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Choir Director', 'Marsha Moore-Brown', 1),
  ('Youth Choir Leader', 'Dorenzo Palmer', 2),
  ('Men''s Choir Leader', 'Leighton Muir', 3),
  ('Ladies'' Choir Leader', 'Carlene Wallace', 4),
  ('Children''s Choir Leader', 'Dajaunea Palmer', 5),
  ('Children''s Choir Leader', 'Avery Pryce', 6),
  ('Praise & Worship Team Leader', 'Racquel Philburn Page', 7),
  ('Praise & Worship Team Member', 'Marsha Moore Brown', 8),
  ('Praise & Worship Team Member', 'Avery Pryce', 9),
  ('Praise & Worship Team Member', 'Davoy Palmer', 10),
  ('Praise & Worship Team Member', 'Dorenzo Palmer', 11),
  ('Praise & Worship Team Member', 'Melissa Ffrench', 12),
  ('Praise & Worship Team Member', 'Nicholas Hall', 13),
  ('Praise & Worship Team Member', 'Kimaya Brown', 14),
  ('Praise & Worship Team Member', 'Dajaunea Palmer', 15),
  ('Praise & Worship Team Member', 'Kerry Wallace', 16),
  ('Praise & Worship Team Member', 'Sylvan Scarlett', 17),
  ('Praise & Worship Team Member', 'Niveah Hinds', 18),
  ('Praise & Worship Team Member', 'Pennola Williams', 19),
  ('Choir Member', 'Sharon Moore', 20),
  ('Choir Member', 'Angela Brown', 21),
  ('Choir Member', 'Carlile Reid', 22),
  ('Choir Member', 'Carlene Wallace', 23),
  ('Choir Member', 'Dajaunea Palmer', 24),
  ('Choir Member', 'Damion Holding', 25),
  ('Choir Member', 'David Williams', 26),
  ('Choir Member', 'Davoy Palmer', 27),
  ('Choir Member', 'Shantel Palmer', 28),
  ('Choir Member', 'Janelle Palmer', 29),
  ('Choir Member', 'Etta Brown', 30),
  ('Choir Member', 'Jaheim Jarrett', 31),
  ('Choir Member', 'Javaughn McLennon', 32),
  ('Choir Member', 'Phyllis Jenkins', 33),
  ('Choir Member', 'Lorna Whittle', 34),
  ('Choir Member', 'Nadine Scott', 35),
  ('Choir Member', 'Sherril Edwards', 36),
  ('Choir Member', 'Muriel Lewis', 37),
  ('Choir Member', 'Veneshia Williams', 38),
  ('Choir Member', 'Sylvan Scarlett', 39),
  ('Choir Member', 'Adriano Irons', 40),
  ('Choir Member', 'Beverly Stone', 41),
  ('Choir Member', 'Bryan Stewart', 42),
  ('Choir Member', 'Stephen Dodd', 43),
  ('Choir Member', 'Camilla Smiley', 44),
  ('Choir Member', 'David Wallace', 45),
  ('Choir Member', 'Edna Hall', 46),
  ('Choir Member', 'Avery Pryce', 47),
  ('Choir Member', 'Joan Scarlett', 48),
  ('Choir Member', 'Kareen Hamilton', 49),
  ('Choir Member', 'Michell Kelly', 50),
  ('Choir Member', 'Nicholas Hall', 51),
  ('Choir Member', 'Ryando Ford', 52),
  ('Choir Member', 'Sandra Reid', 53),
  ('Choir Member', 'Tiffany Palmer', 54),
  ('Choir Member', 'Velma Hamilton', 55),
  ('Choir Member', 'Daine Palmer', 56),
  ('Choir Member', 'Sheila Vanci Brown', 57),
  ('Choir Member', 'Mattase Sewell-Brown', 58),
  ('Choir Member', 'Peter Brown', 59),
  ('Choir Member', 'Garion Holding', 60)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'ushers-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Overseer', 'Bishop Harvil Holding', 1),
  ('Director', 'Millicent Wallace', 2),
  ('Assist Director', 'Muriel Lewis', 3),
  ('Member', 'Dion Powell', 4),
  ('Member', 'Mowaine Spaulding', 5),
  ('Member', 'Enos Whollery', 6),
  ('Member', 'Tonoya Thomas', 7),
  ('Member', 'Niveah Hinds', 8),
  ('Member', 'Jillian Hinds', 9),
  ('Member', 'Karlene Wallace', 10),
  ('Member', 'Desrine Smith', 11),
  ('Member', 'Etta Brown', 12),
  ('Member', 'Joan Scarlett', 13),
  ('Member', 'Sheila Vanci Brown', 14)
) as v(position_title, display_name, sort_order);

with mn as (select id from public.ministries where slug = 'media-ministry'),
     cy as (select id from public.church_years where label = '2026-2027')
insert into public.ministry_assignments (organization_id, ministry_id, display_name, position_title, church_year_id, is_active, public_visible, sort_order)
select (select id from public.organizations where slug = 'bull-bay'), mn.id, v.display_name, v.position_title, cy.id, true, false, v.sort_order
from mn, cy, (values
  ('Member', 'Shamar Baker', 1),
  ('Member', 'Dorenzo Palmer', 2),
  ('Member', 'Melisa Ffrench', 3),
  ('Member', 'Jevaughn Mclennon', 4),
  ('Member', 'Jamelia Peart', 5),
  ('Member', 'Tonoya Thomas', 6),
  ('Member', 'Niveah Hinds', 7),
  ('Member', 'Adriano Irons', 8),
  ('Member', 'Amelia O’gilvie', 9)
) as v(position_title, display_name, sort_order);
