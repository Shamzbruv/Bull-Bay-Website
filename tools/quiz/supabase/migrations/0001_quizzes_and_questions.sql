-- Quizzes and questions (spec §26)
-- IDs are text, not uuid: the app assigns readable slugs itself (e.g. the
-- seeded "1-kings-chapter-1" / "1kings1-q9") rather than relying on the
-- database to generate them.

create table if not exists quizzes (
  id text primary key,
  title text not null,
  description text,
  scripture text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  times_played integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists questions (
  id text primary key,
  quiz_id text not null references quizzes(id) on delete cascade,

  round_name text,
  question_number integer not null,

  question_type text not null check (
    question_type in (
      'multiple_choice', 'short_answer', 'true_false',
      'who_am_i', 'scripture_reference', 'fill_blank', 'tie_breaker'
    )
  ),

  question text not null,
  options jsonb,
  correct_answer text not null,
  explanation text not null,
  scripture_reference text,

  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  points integer not null default 1,
  time_limit integer,

  created_at timestamptz not null default now()
);

create index if not exists questions_quiz_id_idx on questions (quiz_id);

create or replace function increment_quiz_times_played(quiz_id text)
returns void
language sql
as $$
  update quizzes set times_played = times_played + 1 where id = quiz_id;
$$;
