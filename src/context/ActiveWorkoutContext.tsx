import React, { createContext, useCallback, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ActiveWorkoutContextValue {
  activeWorkoutId: string | null;
  startWorkout: (date: string, bodyPart: string) => Promise<void>;
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
    async (date: string, bodyPart: string) => {
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
