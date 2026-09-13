-- Routine templates: saved exercise line-ups a user can start a workout from.

create table if not exists routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  body_part text,
  created_at timestamptz not null default now()
);

alter table routine_templates enable row level security;

create policy "Routine templates are managed by owner" on routine_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists routine_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references routine_templates on delete cascade,
  exercise_id uuid not null references exercise_catalog,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table routine_template_exercises enable row level security;

create policy "Routine template exercises are managed by template owner" on routine_template_exercises
  for all using (
    exists (select 1 from routine_templates t where t.id = template_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from routine_templates t where t.id = template_id and t.user_id = auth.uid())
  );
