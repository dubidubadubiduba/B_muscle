import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { BODY_PARTS } from '../constants';
import type { ExerciseSetHistoryRow, RoutineTemplate, Workout } from '../types/database';

interface ExerciseSessionSummary {
  exerciseId: string;
  exerciseName: string;
  date: string;
  topWeight: number;
  repsAtTopWeight: number | null;
  setCount: number;
}

function summarizeSessions(rows: ExerciseSetHistoryRow[]): ExerciseSessionSummary[] {
  const sessions = new Map<string, ExerciseSessionSummary>();
  rows.forEach((row) => {
    const key = `${row.workout_id}_${row.exercise_id}`;
    const weight = row.weight_kg ?? 0;
    const existing = sessions.get(key);
    if (!existing) {
      sessions.set(key, {
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        date: row.date,
        topWeight: weight,
        repsAtTopWeight: row.reps,
        setCount: 1,
      });
    } else {
      existing.setCount += 1;
      if (weight > existing.topWeight) {
        existing.topWeight = weight;
        existing.repsAtTopWeight = row.reps;
      }
    }
  });
  return Array.from(sessions.values());
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { activeWorkoutId, startWorkout } = useActiveWorkout();
  const navigation = useNavigation<any>();
  const [bodyPart, setBodyPart] = useState(BODY_PARTS[0]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const { data: recentWorkouts } = useQuery({
    queryKey: ['recent-workouts', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as Workout[];
    },
    enabled: !!session,
  });

  const { data: templates } = useQuery({
    queryKey: ['routine-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RoutineTemplate[];
    },
    enabled: !!session,
  });

  const { data: exerciseHistory } = useQuery({
    queryKey: ['exercise-history-dashboard', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercise_set_history').select('*');
      if (error) throw error;
      return data as ExerciseSetHistoryRow[];
    },
    enabled: !!session,
  });

  const exerciseDashboard = useMemo(() => {
    const sessions = summarizeSessions(exerciseHistory ?? []);
    const byExercise = new Map<string, { name: string; latest: ExerciseSessionSummary; best: ExerciseSessionSummary }>();
    sessions.forEach((s) => {
      const existing = byExercise.get(s.exerciseId);
      if (!existing) {
        byExercise.set(s.exerciseId, { name: s.exerciseName, latest: s, best: s });
        return;
      }
      if (s.date > existing.latest.date) existing.latest = s;
      if (s.topWeight > existing.best.topWeight) existing.best = s;
    });
    return Array.from(byExercise.values()).sort((a, b) => (a.latest.date < b.latest.date ? 1 : -1));
  }, [exerciseHistory]);

  function handleSelectTemplate(template: RoutineTemplate) {
    if (selectedTemplateId === template.id) {
      setSelectedTemplateId(null);
      return;
    }
    setSelectedTemplateId(template.id);
    if (template.body_part) setBodyPart(template.body_part);
  }

  async function handleStart() {
    setStarting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await startWorkout(today, bodyPart, selectedTemplateId);
      navigation.navigate('Workout');
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        오늘 운동할 부위
      </Text>
      <View style={styles.chipRow}>
        {BODY_PARTS.map((part) => (
          <Chip key={part} selected={bodyPart === part} onPress={() => setBodyPart(part)} style={styles.chip}>
            {part}
          </Chip>
        ))}
      </View>

      {templates && templates.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            템플릿으로 시작
          </Text>
          <View style={styles.chipRow}>
            {templates.map((template) => (
              <Chip
                key={template.id}
                selected={selectedTemplateId === template.id}
                onPress={() => handleSelectTemplate(template)}
                style={styles.chip}
              >
                {template.name}
              </Chip>
            ))}
          </View>
        </>
      )}

      <Button
        mode="contained"
        onPress={handleStart}
        loading={starting}
        disabled={!!activeWorkoutId}
        style={styles.startButton}
      >
        {activeWorkoutId ? '진행 중인 운동이 있어요' : '운동 시작'}
      </Button>

      <Button mode="text" onPress={() => navigation.navigate('RoutineManage')} style={styles.manageButton}>
        템플릿 관리
      </Button>
      <Button mode="text" onPress={() => navigation.navigate('Import')} style={styles.manageButton}>
        기록 가져오기
      </Button>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        운동별 기록
      </Text>
      {exerciseDashboard.length === 0 ? (
        <Text style={styles.empty}>아직 기록이 없어요</Text>
      ) : (
        exerciseDashboard.map((item) => (
          <Card key={item.name} style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall">{item.name}</Text>
              <Text variant="bodySmall" style={styles.muted}>
                최근 · {item.latest.topWeight}kg × {item.latest.repsAtTopWeight ?? '?'}회 × {item.latest.setCount}세트 (
                {item.latest.date})
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                최고 · {item.best.topWeight}kg × {item.best.repsAtTopWeight ?? '?'}회 × {item.best.setCount}세트 (
                {item.best.date})
              </Text>
            </Card.Content>
          </Card>
        ))
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>
        최근 기록
      </Text>
      <FlatList
        data={recentWorkouts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text>
                {item.date} · {item.body_part}
              </Text>
              <Text variant="bodySmall">
                {item.estimated_calories ? `약 ${item.estimated_calories}kcal` : '진행 중'}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>아직 기록이 없어요</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { marginRight: 8 },
  startButton: { marginBottom: 8 },
  manageButton: { marginBottom: 16 },
  sectionTitle: { marginBottom: 8 },
  card: { marginBottom: 8 },
  muted: { color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 16 },
});
