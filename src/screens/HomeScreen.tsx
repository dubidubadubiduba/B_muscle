import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { BODY_PARTS } from '../constants';
import type { RoutineTemplate, Workout } from '../types/database';

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
  empty: { textAlign: 'center', color: '#888', marginTop: 16 },
});
