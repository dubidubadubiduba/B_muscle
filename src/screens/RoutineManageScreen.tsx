import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, List, Text, TextInput } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ExercisePicker from '../components/ExercisePicker';
import { BODY_PARTS } from '../constants';
import type { RoutineTemplate } from '../types/database';

interface TemplateExerciseRow {
  id: string;
  order_index: number;
  exercise_id: string;
  exercise: { name: string } | null;
}

function TemplateCard({ template }: { template: RoutineTemplate }) {
  const queryClient = useQueryClient();
  const exercisesKey = ['routine-template-exercises', template.id];

  const { data: exercises } = useQuery({
    queryKey: exercisesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_template_exercises')
        .select('*, exercise:exercise_catalog(name)')
        .eq('template_id', template.id)
        .order('order_index');
      if (error) throw error;
      return data as TemplateExerciseRow[];
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: { id: string }) => {
      const orderIndex = exercises?.length ?? 0;
      const { error } = await supabase.from('routine_template_exercises').insert({
        template_id: template.id,
        exercise_id: exercise.id,
        order_index: orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  });

  const removeExerciseMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from('routine_template_exercises').delete().eq('id', rowId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('routine_templates').delete().eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine-templates'] }),
  });

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.templateHeader}>
          <Text variant="titleMedium">
            {template.name}
            {template.body_part ? ` · ${template.body_part}` : ''}
          </Text>
          <Button mode="text" compact onPress={() => deleteTemplateMutation.mutate()}>
            삭제
          </Button>
        </View>
        {(exercises ?? []).map((row) => (
          <List.Item
            key={row.id}
            title={row.exercise?.name ?? '알 수 없음'}
            right={() => (
              <Button mode="text" compact onPress={() => removeExerciseMutation.mutate(row.id)}>
                삭제
              </Button>
            )}
          />
        ))}
        <ExercisePicker label="종목 추가" onSelect={(exercise) => addExerciseMutation.mutate(exercise)} />
      </Card.Content>
    </Card>
  );
}

export default function RoutineManageScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [bodyPart, setBodyPart] = useState(BODY_PARTS[0]);

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
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!session || name.trim().length === 0) return;
      const { error } = await supabase.from('routine_templates').insert({
        user_id: session.user.id,
        name: name.trim(),
        body_part: bodyPart,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['routine-templates'] });
    },
  });

  return (
    <FlatList
      style={styles.container}
      data={templates ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TemplateCard template={item} />}
      ListHeaderComponent={
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.formTitle}>
              새 루틴 템플릿
            </Text>
            <TextInput label="이름 (예: 하체 루틴)" value={name} onChangeText={setName} style={styles.input} />
            <View style={styles.chipRow}>
              {BODY_PARTS.map((part) => (
                <Chip key={part} selected={bodyPart === part} onPress={() => setBodyPart(part)} style={styles.chip}>
                  {part}
                </Chip>
              ))}
            </View>
            <Button
              mode="contained"
              onPress={() => createTemplateMutation.mutate()}
              loading={createTemplateMutation.isPending}
            >
              템플릿 만들기
            </Button>
          </Card.Content>
        </Card>
      }
      ListEmptyComponent={<Text style={styles.empty}>아직 템플릿이 없어요</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { marginBottom: 16 },
  formTitle: { marginBottom: 8 },
  input: { marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { marginRight: 8 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#888', marginTop: 16 },
});
