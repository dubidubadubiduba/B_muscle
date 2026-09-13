import React, { createContext, useCallback, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ActiveWorkoutContextValue {
  activeWorkoutId: string | null;
  startWorkout: (date: string, bodyPart: string, templateId?: string | null) => Promise<void>;
  finishWorkout: () => Promise<void>;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue>({
  activeWorkoutId: null,
  startWorkout: async () => {},
  finishWorkout: async () => {},
});

const DEFAULT_WEIGHT_KG = 60;
const CALORIE_MET = 6;

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);

  const startWorkout = useCallback(
    async (date: string, bodyPart: string, templateId?: string | null) => {
      if (!session) return;
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: session.user.id,
          date,
          body_part: bodyPart,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      if (templateId) {
        const { data: templateExercises, error: templateError } = await supabase
          .from('routine_template_exercises')
          .select('exercise_id, order_index')
          .eq('template_id', templateId)
          .order('order_index');
        if (templateError) throw templateError;

        if (templateExercises && templateExercises.length > 0) {
          const { error: insertError } = await supabase.from('workout_exercises').insert(
            templateExercises.map((te) => ({
              workout_id: data.id,
              exercise_id: te.exercise_id,
              order_index: te.order_index,
            }))
          );
          if (insertError) throw insertError;
        }
      }

      setActiveWorkoutId(data.id);
    },
    [session]
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkoutId || !session) return;

    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('started_at')
      .eq('id', activeWorkoutId)
      .single();
    if (fetchError) throw fetchError;

    const { data: profile } = await supabase
      .from('profiles')
      .select('weight_kg')
      .eq('id', session.user.id)
      .maybeSingle();

    const startedAt = workout?.started_at ? new Date(workout.started_at) : new Date();
    const endedAt = new Date();
    const durationHours = (endedAt.getTime() - startedAt.getTime()) / 1000 / 60 / 60;
    const weightKg = profile?.weight_kg ?? DEFAULT_WEIGHT_KG;
    const estimatedCalories = Math.round(CALORIE_MET * weightKg * durationHours);

    const { error } = await supabase
      .from('workouts')
      .update({ ended_at: endedAt.toISOString(), estimated_calories: estimatedCalories })
      .eq('id', activeWorkoutId);
    if (error) throw error;

    setActiveWorkoutId(null);
  }, [activeWorkoutId, session]);

  return (
    <ActiveWorkoutContext.Provider value={{ activeWorkoutId, startWorkout, finishWorkout }}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  return useContext(ActiveWorkoutContext);
}
