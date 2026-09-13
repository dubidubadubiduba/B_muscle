import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { ensureExerciseByName } from '../lib/exercises';
import { useAuth } from '../context/AuthContext';
import type { SetType } from '../types/database';

interface ParsedSet {
  weightKg: number | null;
  reps: number | null;
  setType: SetType;
  holdSeconds: number | null;
}

interface ParsedExercise {
  name: string;
  sets: ParsedSet[];
}

interface ParsedWorkout {
  date: string;
  bodyPart: string | null;
  estimatedCalories: number | null;
  exercises: ParsedExercise[];
}

export default function ImportScreen() {
  const { session } = useAuth();
  const [rawText, setRawText] = useState('');
  const [parsedWorkouts, setParsedWorkouts] = useState<ParsedWorkout[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  async function handleAnalyze() {
    setError(null);
    setSavedCount(null);
    setAnalyzing(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('parse-workout-log', {
        body: { text: rawText },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setParsedWorkouts((data?.workouts as ParsedWorkout[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  function removeWorkout(index: number) {
    setParsedWorkouts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmImport() {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      let count = 0;
      for (const workout of parsedWorkouts) {
        const { data: workoutRow, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: session.user.id,
            date: workout.date,
            body_part: workout.bodyPart,
            estimated_calories: workout.estimatedCalories,
          })
          .select('id')
          .single();
        if (workoutError) throw workoutError;

        for (let i = 0; i < workout.exercises.length; i += 1) {
          const exercise = workout.exercises[i];
          const exerciseId = await ensureExerciseByName(exercise.name);

          const { data: workoutExerciseRow, error: weError } = await supabase
            .from('workout_exercises')
            .insert({ workout_id: workoutRow.id, exercise_id: exerciseId, order_index: i })
            .select('id')
            .single();
          if (weError) throw weError;

          if (exercise.sets.length > 0) {
            const { error: setsError } = await supabase.from('sets').insert(
              exercise.sets.map((set, setIndex) => ({
                workout_exercise_id: workoutExerciseRow.id,
                set_index: setIndex,
                weight_kg: set.weightKg,
                reps: set.reps,
                set_type: set.setType,
                hold_seconds: set.holdSeconds,
              }))
            );
            if (setsError) throw setsError;
          }
        }
        count += 1;
      }
      setSavedCount(count);
      setParsedWorkouts([]);
      setRawText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleMedium" style={styles.title}>
        운동 기록 텍스트 붙여넣기
      </Text>
      <TextInput
        label="여기에 과거 기록을 붙여넣어주세요"
        value={rawText}
        onChangeText={setRawText}
        multiline
        numberOfLines={10}
        style={styles.textArea}
      />
      <Button mode="contained" onPress={handleAnalyze} loading={analyzing} disabled={rawText.trim().length === 0}>
        분석하기
      </Button>

      {error && (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      )}

      {savedCount !== null && (
        <Text variant="bodyMedium" style={styles.success}>
          {savedCount}개 운동 기록을 가져왔어요.
        </Text>
      )}

      {parsedWorkouts.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.previewTitle}>
            미리보기 ({parsedWorkouts.length}개)
          </Text>
          {parsedWorkouts.map((workout, index) => {
            const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            return (
              <Card key={`${workout.date}-${index}`} style={styles.card}>
                <Card.Content>
                  <Text variant="titleSmall">
                    {workout.date} · {workout.bodyPart ?? '기타'}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    종목 {workout.exercises.length}개 · 세트 {totalSets}개
                    {workout.estimatedCalories ? ` · 약 ${workout.estimatedCalories}kcal` : ''}
                  </Text>
                  {workout.exercises.map((exercise) => (
                    <Text key={exercise.name} variant="bodySmall" style={styles.exerciseLine}>
                      - {exercise.name} ({exercise.sets.length}세트)
                    </Text>
                  ))}
                  <Button mode="text" compact onPress={() => removeWorkout(index)}>
                    이 항목 제외
                  </Button>
                </Card.Content>
              </Card>
            );
          })}
          <Button mode="contained" onPress={handleConfirmImport} loading={saving}>
            가져오기 확정
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { marginBottom: 8 },
  textArea: { marginBottom: 12, minHeight: 160 },
  previewTitle: { marginTop: 16, marginBottom: 8 },
  card: { marginBottom: 12 },
  exerciseLine: { marginTop: 2 },
  muted: { color: '#888', marginTop: 4, marginBottom: 8 },
  error: { color: 'red', marginTop: 8 },
  success: { color: '#2e7d32', marginTop: 8 },
});
