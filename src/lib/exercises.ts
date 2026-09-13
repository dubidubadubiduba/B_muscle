import { supabase } from './supabase';

export async function ensureExerciseByName(name: string): Promise<string> {
  const trimmed = name.trim();

  const { data: existing, error: searchError } = await supabase
    .from('exercise_catalog')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle();
  if (searchError) throw searchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('exercise_catalog')
    .insert({ name: trimmed })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id;
}
