import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, SegmentedButtons, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import BarChart from '../components/BarChart';
import CalendarHeatmap from '../components/CalendarHeatmap';
import type { ExerciseSetHistoryRow, Workout } from '../types/database';

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const offset = (date.getDay() + 6) % 7; // Monday = 0
  const start = new Date(date);
  start.setDate(date.getDate() - offset);
  return start;
}

export default function StatsScreen() {
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
  const today = new Date();

  const weekStart = startOfWeek(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const { data: weeklyWorkouts } = useQuery({
    queryKey: ['stats-weekly-workouts', toDateKey(weekStart)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .gte('date', toDateKey(weekStart))
        .lte('date', toDateKey(today));
      if (error) throw error;
      return data as Workout[];
    },
    enabled: range === 'weekly',
  });

  const { data: monthlySets } = useQuery({
    queryKey: ['stats-monthly-sets', toDateKey(prevMonthStart)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_set_history')
        .select('*')
        .gte('date', toDateKey(prevMonthStart))
        .lte('date', toDateKey(today));
      if (error) throw error;
      return data as ExerciseSetHistoryRow[];
    },
    enabled: range === 'monthly',
  });

  const { data: allTimeHistory } = useQuery({
    queryKey: ['stats-pr-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercise_set_history').select('*');
      if (error) throw error;
      return data as ExerciseSetHistoryRow[];
    },
  });

  const weeklyStats = useMemo(() => {
    const workouts = weeklyWorkouts ?? [];
    const totalCalories = workouts.reduce((sum, w) => sum + (w.estimated_calories ?? 0), 0);
    const bodyPartCounts = new Map<string, number>();
    workouts.forEach((w) => {
      const key = w.body_part ?? '기타';
      bodyPartCounts.set(key, (bodyPartCounts.get(key) ?? 0) + 1);
    });
    return {
      totalWorkouts: workouts.length,
      totalCalories,
      bodyPartData: Array.from(bodyPartCounts.entries()).map(([label, value]) => ({ label, value })),
    };
  }, [weeklyWorkouts]);

  const monthlyStats = useMemo(() => {
    const rows = monthlySets ?? [];
    const currentMonthKey = toDateKey(monthStart).slice(0, 7);
    const prevMonthKey = toDateKey(prevMonthStart).slice(0, 7);

    const currentRows = rows.filter((r) => r.date.slice(0, 7) === currentMonthKey);
    const prevRows = rows.filter((r) => r.date.slice(0, 7) === prevMonthKey);

    const volumeOf = (list: ExerciseSetHistoryRow[]) =>
      list.reduce((sum, r) => sum + (r.weight_kg ?? 0) * (r.reps ?? 0), 0);

    const currentVolume = volumeOf(currentRows);
    const prevVolume = volumeOf(prevRows);

    const dailyCounts: Record<string, number> = {};
    currentRows.forEach((r) => {
      dailyCounts[r.date] = (dailyCounts[r.date] ?? 0) + 1;
    });

    return { currentVolume, prevVolume, dailyCounts };
  }, [monthlySets, monthStart, prevMonthStart]);

  const prList = useMemo(() => {
    const rows = allTimeHistory ?? [];
    const byExercise = new Map<string, { id: string; name: string; maxWeight: number; lastDate: string }>();
    rows.forEach((row) => {
      const existing = byExercise.get(row.exercise_id);
      const weight = row.weight_kg ?? 0;
      if (!existing) {
        byExercise.set(row.exercise_id, {
          id: row.exercise_id,
          name: row.exercise_name,
          maxWeight: weight,
          lastDate: row.date,
        });
      } else {
        existing.maxWeight = Math.max(existing.maxWeight, weight);
        if (row.date > existing.lastDate) existing.lastDate = row.date;
      }
    });
    return Array.from(byExercise.values()).sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
  }, [allTimeHistory]);

  const volumeDelta =
    monthlyStats.prevVolume > 0
      ? Math.round(((monthlyStats.currentVolume - monthlyStats.prevVolume) / monthlyStats.prevVolume) * 100)
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SegmentedButtons
        value={range}
        onValueChange={(value) => setRange(value as 'weekly' | 'monthly')}
        buttons={[
          { value: 'weekly', label: '주간' },
          { value: 'monthly', label: '월간' },
        ]}
        style={styles.segment}
      />

      {range === 'weekly' ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">이번 주</Text>
            <Text variant="bodyMedium" style={styles.line}>
              총 {weeklyStats.totalWorkouts}회 운동 · 약 {Math.round(weeklyStats.totalCalories)}kcal
            </Text>
            {weeklyStats.bodyPartData.length > 0 && (
              <View style={styles.chart}>
                <BarChart data={weeklyStats.bodyPartData} unit="회" />
              </View>
            )}
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">이번 달</Text>
            <Text variant="bodyMedium" style={styles.line}>
              총 볼륨 {Math.round(monthlyStats.currentVolume)}kg
              {volumeDelta !== null ? ` (저번 달 대비 ${volumeDelta >= 0 ? '+' : ''}${volumeDelta}%)` : ''}
            </Text>
            <View style={styles.chart}>
              <CalendarHeatmap month={monthStart} counts={monthlyStats.dailyCounts} />
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">종목별 PR</Text>
          {prList.length === 0 ? (
            <Text variant="bodySmall" style={styles.muted}>
              아직 기록이 없어요
            </Text>
          ) : (
            prList.map((item) => (
              <Text key={item.id} variant="bodyMedium" style={styles.line}>
                {item.name} · {item.maxWeight}kg ({item.lastDate})
              </Text>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  segment: { marginBottom: 16 },
  card: { marginBottom: 16 },
  chart: { marginTop: 12 },
  line: { marginTop: 4 },
  muted: { color: '#888', marginTop: 4 },
});
