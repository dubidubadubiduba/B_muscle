import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import SetTypeToggle from './SetTypeToggle';
import type { SetType } from '../types/database';

interface SetInput {
  weightKg: number;
  reps: number;
  setType: SetType;
  holdSeconds: number | null;
}

interface Props {
  onSubmit: (input: SetInput) => void;
  submitting?: boolean;
  defaultWeightKg?: number | null;
}

export default function SetInputRow({ onSubmit, submitting, defaultWeightKg }: Props) {
  const [weight, setWeight] = useState(defaultWeightKg ? String(defaultWeightKg) : '');
  const [reps, setReps] = useState('');
  const [holdSeconds, setHoldSeconds] = useState('');
  const [setType, setSetType] = useState<SetType>('normal');

  function handleSubmit() {
    const weightKg = parseFloat(weight);
    const repsNum = parseInt(reps, 10);
    if (Number.isNaN(weightKg) || Number.isNaN(repsNum)) return;
    onSubmit({
      weightKg,
      reps: repsNum,
      setType,
      holdSeconds: holdSeconds ? parseInt(holdSeconds, 10) : null,
    });
    setReps('');
    setHoldSeconds('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          label="무게(kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          style={styles.input}
          dense
        />
        <TextInput
          label="횟수"
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
          style={styles.input}
          dense
        />
        <TextInput
          label="홀드(초)"
          value={holdSeconds}
          onChangeText={setHoldSeconds}
          keyboardType="numeric"
          style={styles.input}
          dense
        />
      </View>
      <SetTypeToggle value={setType} onChange={setSetType} />
      <Button mode="contained-tonal" onPress={handleSubmit} loading={submitting} style={styles.submit}>
        세트 완료
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { flex: 1 },
  submit: { marginTop: 8 },
});
