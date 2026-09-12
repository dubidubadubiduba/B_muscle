import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import type { Workout } from '../types/database';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();

  const { data: workouts } = useQuery({
    queryKey: ['all-workouts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Workout[];
    },
  });

  return (
    <FlatList
      style={styles.container}
      data={workouts ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card} onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}>
          <Card.Content>
            <Text variant="titleMedium">
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { marginBottom: 8 },
  empty: { textAlign: 'center', color: '#888', marginTop: 16 },
});
