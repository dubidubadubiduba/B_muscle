-- Per-exercise historical set data, shared by the PR card and the stats dashboard.

create or replace view exercise_set_history
with (security_invoker = true) as
select
  s.id as set_id,
  s.weight_kg,
  s.reps,
  s.set_type,
  s.hold_seconds,
  s.created_at,
  we.exercise_id,
  ec.name as exercise_name,
  we.workout_id,
  w.user_id,
  w.date,
  w.body_part
from sets s
join workout_exercises we on we.id = s.workout_exercise_id
join exercise_catalog ec on ec.id = we.exercise_id
join workouts w on w.id = we.workout_id;

grant select on exercise_set_history to authenticated;
