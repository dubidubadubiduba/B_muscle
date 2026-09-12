-- Phase 1 MVP schema: profiles, exercise catalog, workouts, workout_exercises, sets

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  sex text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by owner" on profiles
  for select using (auth.uid() = id);
create policy "Profiles are insertable by owner" on profiles
  for insert with check (auth.uid() = id);
create policy "Profiles are updatable by owner" on profiles
  for update using (auth.uid() = id);

-- Exercise catalog (shared read, owner-created)
create table if not exists exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body_part text,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

alter table exercise_catalog enable row level security;

create policy "Exercise catalog readable by authenticated users" on exercise_catalog
  for select using (auth.role() = 'authenticated');
create policy "Exercise catalog insertable by authenticated users" on exercise_catalog
  for insert with check (auth.uid() = created_by);

-- Workouts
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  body_part text,
  started_at timestamptz,
  ended_at timestamptz,
  estimated_calories numeric,
  created_at timestamptz not null default now()
);

alter table workouts enable row level security;

create policy "Workouts are managed by owner" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Workout exercises
create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercise_catalog,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table workout_exercises enable row level security;

create policy "Workout exercises are managed by workout owner" on workout_exercises
  for all using (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- Sets
create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises on delete cascade,
  set_index int not null default 0,
  weight_kg numeric,
  reps int,
  set_type text not null default 'normal' check (set_type in ('normal', 'drop', 'assisted')),
  hold_seconds int,
  created_at timestamptz not null default now()
);

alter table sets enable row level security;

create policy "Sets are managed by workout owner" on sets
  for all using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.user_id = auth.uid()
    )
  );

-- Realtime: broadcast row changes for the active-workout live view
alter publication supabase_realtime add table workouts;
alter publication supabase_realtime add table workout_exercises;
alter publication supabase_realtime add table sets;
