import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import SetInputRow from './SetInputRow';
import type { SetType, WorkoutSet } from '../types/database';

interface SetInput {
  weightKg: number;
  reps: number;
  setType: SetType;
  holdSeconds: number | null;
}

interface Props {
  exerciseName: string;
  sets: WorkoutSet[];
  onAddSet: (input: SetInput) => void;
  submitting?: boolean;
}

const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: '',
  drop: '드롭',
  assisted: '보조',
};

export default function ExerciseCard({ exerciseName, sets, onAddSet, submitting }: Props) {
  const lastSet = sets[sets.length - 1];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{exerciseName}</Text>
        {sets.map((set, index) => (
          <Text key={set.id} variant="bodyMedium" style={styles.setLine}>
            {index + 1}세트 · {set.weight_kg}kg × {set.reps}회
            {set.set_type !== 'normal' ? ` (${SET_TYPE_LABEL[set.set_type]})` : ''}
            {set.hold_seconds ? ` · ${set.hold_seconds}초 홀드` : ''}
          </Text>
        ))}
        <SetInputRow
          onSubmit={onAddSet}
          submitting={submitting}
          defaultWeightKg={lastSet?.weight_kg ?? undefined}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  setLine: { marginTop: 4 },
});
