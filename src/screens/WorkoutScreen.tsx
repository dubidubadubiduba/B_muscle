import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import ExerciseCard from '../components/ExerciseCard';
import ExercisePicker from '../components/ExercisePicker';
import type { ExerciseCatalogItem, SetType, WorkoutExercise, WorkoutSet } from '../types/database';

type ExerciseWithSets = WorkoutExercise & { exercise: ExerciseCatalogItem | null; sets: WorkoutSet[] };

export default function WorkoutScreen() {
  const { activeWorkoutId, finishWorkout } = useActiveWorkout();
  const queryClient = useQueryClient();
  const [finishing, setFinishing] = useState(false);

  const workoutExercisesKey = ['workout-exercises', activeWorkoutId];

  const { data: exercises } = useQuery({
    queryKey: workoutExercisesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*, exercise:exercise_catalog(*), sets(*)')
        .eq('workout_id', activeWorkoutId)
        .order('order_index');
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        sets: [...(row.sets as WorkoutSet[])].sort((a, b) => a.set_index - b.set_index),
      })) as ExerciseWithSets[];
    },
    enabled: !!activeWorkoutId,
  });

  useEffect(() => {
    if (!activeWorkoutId) return;

    const channel = supabase
      .channel(`workout-${activeWorkoutId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sets' }, () => {
        queryClient.invalidateQueries({ queryKey: workoutExercisesKey });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_exercises' }, () => {
        queryClient.invalidateQueries({ queryKey: workoutExercisesKey });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkoutId]);

  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: { id: string; name: string }) => {
      const orderIndex = exercises?.length ?? 0;
      const { error } = await supabase.from('workout_exercises').insert({
        workout_id: activeWorkoutId,
        exercise_id: exercise.id,
        order_index: orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutExercisesKey });
    },
  });

  const addSetMutation = useMutation({
    mutationFn: async (input: {
      workoutExerciseId: string;
      setIndex: number;
      weightKg: number;
      reps: number;
      setType: SetType;
      holdSeconds: number | null;
    }) => {
      const { error } = await supabase.from('sets').insert({
        workout_exercise_id: input.workoutExerciseId,
        set_index: input.setIndex,
        weight_kg: input.weightKg,
        reps: input.reps,
        set_type: input.setType,
        hold_seconds: input.holdSeconds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutExercisesKey });
    },
  });

  if (!activeWorkoutId) {
    return (
      <View style={styles.emptyContainer}>
        <Text>홈 화면에서 운동을 먼저 시작해주세요.</Text>
      </View>
    );
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await finishWorkout();
    } finally {
      setFinishing(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ExercisePicker onSelect={(exercise) => addExerciseMutation.mutate(exercise)} />

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exerciseId={item.exercise_id}
            exerciseName={item.exercise?.name ?? '알 수 없음'}
            sets={item.sets}
            submitting={addSetMutation.isPending}
            excludeWorkoutId={activeWorkoutId}
            onAddSet={(input) =>
              addSetMutation.mutate({
                workoutExerciseId: item.id,
                setIndex: item.sets.length,
                ...input,
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />

      <Button mode="contained" onPress={handleFinish} loading={finishing} style={styles.finishButton}>
        운동 종료
      </Button>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { paddingBottom: 16 },
  finishButton: { marginTop: 8, marginBottom: 16 },
});
