export type SetType = 'normal' | 'drop' | 'assisted';

export interface Profile {
  id: string;
  height_cm: number | null;
  weight_kg: number | null;
  sex: string | null;
  created_at: string;
}

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  body_part: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  body_part: string | null;
  started_at: string | null;
  ended_at: string | null;
  estimated_calories: number | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  set_type: SetType;
  hold_seconds: number | null;
  created_at: string;
}
