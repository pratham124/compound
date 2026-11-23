-- Workouts module (PRD section 5): finished workouts and their sets.

create table workouts (
  user_id uuid not null references users (id) on delete cascade,
  id uuid not null check (substr(id::text, 15, 1) = '7'),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  check (finished_at >= started_at),
  primary key (user_id, id)
);

create table workout_exercises (
  user_id uuid not null,
  workout_id uuid not null,
  id uuid not null check (substr(id::text, 15, 1) = '7'),
  position smallint not null check (position >= 0),
  exercise_id text not null,
  primary key (user_id, id),
  foreign key (user_id, workout_id) references workouts (user_id, id) on delete cascade
);

create index workout_exercises_workout_idx on workout_exercises (user_id, workout_id);

create table workout_sets (
  user_id uuid not null,
  workout_exercise_id uuid not null,
  id uuid not null check (substr(id::text, 15, 1) = '7'),
  position smallint not null check (position >= 0),
  reps smallint not null check (reps between 1 and 999),
  -- Null is bodyweight.
  weight numeric check (weight >= 0 and weight <= 99999),
  unit text not null check (unit in ('kg', 'lb')),
  primary key (user_id, id),
  foreign key (user_id, workout_exercise_id) references workout_exercises (user_id, id) on delete cascade
);

create index workout_sets_exercise_idx on workout_sets (user_id, workout_exercise_id);

alter table workouts enable row level security;
alter table workouts force row level security;
alter table workout_exercises enable row level security;
alter table workout_exercises force row level security;
alter table workout_sets enable row level security;
alter table workout_sets force row level security;

create policy workouts_own_rows on workouts to compound_api
  using (user_id = app_user_id()) with check (user_id = app_user_id());
create policy workout_exercises_own_rows on workout_exercises to compound_api
  using (user_id = app_user_id()) with check (user_id = app_user_id());
create policy workout_sets_own_rows on workout_sets to compound_api
  using (user_id = app_user_id()) with check (user_id = app_user_id());

-- No delete on workout_sets: replacing a workout deletes its exercises, and the cascade (run as the table owner)
-- takes their sets.
grant select, insert, update on workouts to compound_api;
grant select, insert, delete on workout_exercises to compound_api;
grant select, insert on workout_sets to compound_api;
