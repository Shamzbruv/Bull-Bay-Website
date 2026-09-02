-- Strategic priorities (slide 6) are distinct from the seven "W" local
-- ministry movements (slide 8 onward): priorities are the church-wide
-- 2026-2027 focus areas, two of which (Male Discipleship, Youth Engagement)
-- are the year's primary focus. The admin "Church direction" screen
-- manages both this table and strategic_movements together.

create table public.strategic_priorities (
  id uuid primary key default gen_random_uuid(),
  church_year_id uuid not null references public.church_years(id) on delete cascade,
  title text not null,
  is_primary_focus boolean not null default false,
  sort_order integer not null default 0,
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger strategic_priorities_set_updated_at before update on public.strategic_priorities
  for each row execute function public.set_updated_at();

alter table public.strategic_priorities enable row level security;
create policy "strategic_priorities public read" on public.strategic_priorities
  for select to anon, authenticated using (public_visible);
create policy "strategic_priorities staff manage" on public.strategic_priorities
  for all to authenticated
  using (exists (select 1 from public.church_years cy where cy.id = church_year_id and public.has_permission(cy.organization_id, 'direction.manage')))
  with check (exists (select 1 from public.church_years cy where cy.id = church_year_id and public.has_permission(cy.organization_id, 'direction.manage')));

with cy as (select id from public.church_years where label = '2026-2027')
insert into public.strategic_priorities (church_year_id, title, is_primary_focus, sort_order)
select cy.id, v.title, v.is_primary, v.sort_order
from cy, (values
  ('Sound Biblical Doctrine', false, 1),
  ('Sustained Prayer', false, 2),
  ('Leadership Development', false, 3),
  ('Male Discipleship', true, 4),
  ('Youth Engagement and Empowerment', true, 5),
  ('Income Generation and Infrastructural Development', false, 6),
  ('Evangelism, Missions and Community Engagement', false, 7)
) as v(title, is_primary, sort_order);
