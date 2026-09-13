import React, { useEffect, useState } from 'react';
import { List, TextInput } from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ExerciseCatalogItem } from '../types/database';

interface Props {
  onSelect: (exercise: { id: string; name: string }) => void;
  label?: string;
}

export default function ExercisePicker({ onSelect, label = '종목 검색 또는 추가' }: Props) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<ExerciseCatalogItem[]>([]);

  useEffect(() => {
    let active = true;
    if (search.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    supabase
      .from('exercise_catalog')
      .select('*')
      .ilike('name', `%${search.trim()}%`)
      .limit(8)
      .then(({ data }) => {
        if (active) setSuggestions((data as ExerciseCatalogItem[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [search]);

  const ensureExerciseMutation = useMutation({
    mutationFn: async (exercise: { id?: string; name: string }) => {
      if (exercise.id) return { id: exercise.id, name: exercise.name };
      const { data, error } = await supabase
        .from('exercise_catalog')
        .insert({ name: exercise.name })
        .select('id, name')
        .single();
      if (error) throw error;
      return { id: data.id as string, name: data.name as string };
    },
    onSuccess: (exercise) => {
      setSearch('');
      setSuggestions([]);
      onSelect(exercise);
    },
  });

  return (
    <>
      <TextInput label={label} value={search} onChangeText={setSearch} />
      {suggestions.length > 0 && (
        <List.Section>
          {suggestions.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              onPress={() => ensureExerciseMutation.mutate({ id: item.id, name: item.name })}
            />
          ))}
          {search.trim().length > 0 && (
            <List.Item
              title={`"${search.trim()}" 새 종목으로 추가`}
              onPress={() => ensureExerciseMutation.mutate({ name: search.trim() })}
            />
          )}
        </List.Section>
      )}
    </>
  );
}
