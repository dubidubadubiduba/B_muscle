import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ExerciseSetHistoryRow } from '../types/database';

interface ExerciseHistory {
  maxWeightKg: number | null;
  recentSets: ExerciseSetHistoryRow[];
}

export function useExerciseHistory(exerciseId: string, excludeWorkoutId?: string | null) {
  return useQuery<ExerciseHistory>({
    queryKey: ['exercise-history', exerciseId, excludeWorkoutId],
    queryFn: async () => {
      const [maxResult, recentResult] = await Promise.all([
        supabase
          .from('exercise_set_history')
          .select('weight_kg')
          .eq('exercise_id', exerciseId)
          .order('weight_kg', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (() => {
          let query = supabase
            .from('exercise_set_history')
            .select('*')
            .eq('exercise_id', exerciseId)
            .order('created_at', { ascending: false })
            .limit(3);
          if (excludeWorkoutId) {
            query = query.neq('workout_id', excludeWorkoutId);
          }
          return query;
        })(),
      ]);

      if (maxResult.error) throw maxResult.error;
      if (recentResult.error) throw recentResult.error;

      return {
        maxWeightKg: maxResult.data?.weight_kg ?? null,
        recentSets: (recentResult.data as ExerciseSetHistoryRow[]) ?? [],
      };
    },
    enabled: !!exerciseId,
  });
}
