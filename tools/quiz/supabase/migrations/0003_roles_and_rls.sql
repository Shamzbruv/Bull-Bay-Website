-- Roles + row-level security (spec §47).
--
-- The app's real access control right now is the local host-PIN gate (see
-- src/lib/auth) — there is no Supabase Auth login flow, so every request
-- from the browser is anonymous. That means policies gated on auth.uid()
-- would silently block every write (creating quizzes, saving game history)
-- the moment RLS is turned on. Until a real Supabase Auth pass wires up
-- admin/quizmaster/viewer logins, the tables below stay open for read AND
-- write to anyone holding the anon key — the PIN screen is what's actually
-- keeping the quiz builder off the public internet, not RLS.
--
-- The `profiles` table is created now so a future auth pass has somewhere
-- to land without another migration; it's unused by the app today.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'quizmaster', 'viewer')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table quizzes enable row level security;
alter table questions enable row level security;
alter table game_sessions enable row level security;
alter table game_teams enable row level security;
alter table profiles enable row level security;

create policy "Quizzes are publicly readable" on quizzes for select using (true);
create policy "Questions are publicly readable" on questions for select using (true);
create policy "Game sessions are publicly readable" on game_sessions for select using (true);
create policy "Game teams are publicly readable" on game_teams for select using (true);

-- Open write access — see note above. Tighten these to check profiles.role
-- once real Supabase Auth logins exist.
create policy "Anyone can manage quizzes" on quizzes for all using (true) with check (true);
create policy "Anyone can manage questions" on questions for all using (true) with check (true);
create policy "Anyone can record game sessions" on game_sessions for all using (true) with check (true);
create policy "Anyone can record game teams" on game_teams for all using (true) with check (true);

create policy "Users read their own profile" on profiles for select using (auth.uid() = id);
create policy "Admins read all profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
