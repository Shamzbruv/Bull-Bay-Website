-- Tag existing sermons with 2026-2027 strategic themes (Word: teaching and
-- discipleship is the public objective for preaching — see docs). Sermon
-- planning itself stays in the pastor workspace; this just aligns the
-- seeded content's topics with the approved theme set.

update public.sermons set topics = array['faith', 'discipleship'] where slug = 'faith-that-stands-when-life-shakes';
update public.sermons set topics = array['prayer', 'watch'] where slug = 'when-prayer-becomes-your-first-response';
update public.sermons set topics = array['purpose', 'discipleship'] where slug = 'created-for-a-purpose-greater-than-fear';
update public.sermons set topics = array['faith', 'stewardship'] where slug = 'grace-for-the-next-step';
update public.sermons set topics = array['prayer', 'worship'] where slug = 'a-house-of-worship';
update public.sermons set topics = array['purpose', 'evangelism'] where slug = 'use-what-god-placed-in-your-hands';
