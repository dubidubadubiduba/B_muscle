import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useExerciseHistory } from '../hooks/useExerciseHistory';

interface Props {
  exerciseId: string;
  excludeWorkoutId?: string | null;
}

export default function PRCard({ exerciseId, excludeWorkoutId }: Props) {
  const { data } = useExerciseHistory(exerciseId, excludeWorkoutId);

  if (!data || (data.maxWeightKg === null && data.recentSets.length === 0)) {
    return (
      <View style={styles.container}>
        <Text variant="bodySmall" style={styles.muted}>
          처음 하는 종목이에요
        </Text>
      </View>
    );
  }

  const recentLabel = data.recentSets.map((set) => `${set.weight_kg}kg×${set.reps}`).join(', ');

  return (
    <View style={styles.container}>
      {data.maxWeightKg !== null && (
        <Text variant="bodySmall" style={styles.pr}>
          PR: {data.maxWeightKg}kg
        </Text>
      )}
      {recentLabel.length > 0 && (
        <Text variant="bodySmall" style={styles.muted}>
          최근: {recentLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  pr: { fontWeight: '600' },
  muted: { color: '#888' },
});
