import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import type { ExerciseCatalogItem, SetType, WorkoutExercise, WorkoutSet } from '../types/database';

type ExerciseWithSets = WorkoutExercise & { exercise: ExerciseCatalogItem | null; sets: WorkoutSet[] };

const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: '',
  drop: '드롭',
  assisted: '보조',
};

export default function WorkoutDetailScreen() {
  const route = useRoute<any>();
  const { workoutId } = route.params;

  const { data: exercises } = useQuery({
    queryKey: ['workout-detail', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*, exercise:exercise_catalog(*), sets(*)')
        .eq('workout_id', workoutId)
        .order('order_index');
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        sets: [...(row.sets as WorkoutSet[])].sort((a, b) => a.set_index - b.set_index),
      })) as ExerciseWithSets[];
    },
  });

  return (
    <FlatList
      style={styles.container}
      data={exercises ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">{item.exercise?.name}</Text>
            {item.sets.map((set, index) => (
              <Text key={set.id} variant="bodyMedium" style={styles.setLine}>
                {index + 1}세트 · {set.weight_kg}kg × {set.reps}회
                {set.set_type !== 'normal' ? ` (${SET_TYPE_LABEL[set.set_type]})` : ''}
                {set.hold_seconds ? ` · ${set.hold_seconds}초 홀드` : ''}
              </Text>
            ))}
          </Card.Content>
        </Card>
      )}
      ListEmptyComponent={<Text style={styles.empty}>불러오는 중...</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { marginBottom: 8 },
  setLine: { marginTop: 4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 16 },
});
