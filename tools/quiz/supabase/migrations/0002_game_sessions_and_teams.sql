-- Game history (spec §27-28)

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text references quizzes(id),

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  game_mode text,
  settings jsonb,

  winner_name text,
  final_scores jsonb,
  question_count integer default 0
);

create table if not exists game_teams (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid references game_sessions(id) on delete cascade,

  name text not null,
  score integer not null default 0,
  team_order integer
);

create index if not exists game_teams_session_idx on game_teams (game_session_id);
create index if not exists game_sessions_completed_idx on game_sessions (completed_at desc);
