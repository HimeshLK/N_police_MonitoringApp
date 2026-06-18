import { supabase } from './supabase';

export interface Division {
  id: string;
  name: string;
  district: string;
  created_at: string;
  officer_count?: number;
}

export interface DivisionInput {
  name: string;
  district: string;
}

export async function getDivisions(): Promise<Division[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('*, officers(count)')
    .order('name');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Division & { officers: { count: number }[] }) => ({
    ...row,
    officer_count: row.officers?.[0]?.count ?? 0,
  }));
}

export async function getDivision(id: string): Promise<Division> {
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Division;
}

export async function createDivision(input: DivisionInput): Promise<Division> {
  const { data, error } = await supabase
    .from('divisions')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Division;
}

export async function updateDivision(id: string, input: DivisionInput): Promise<Division> {
  const { data, error } = await supabase
    .from('divisions')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Division;
}

export async function deleteDivision(id: string): Promise<void> {
  const { error } = await supabase
    .from('divisions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
