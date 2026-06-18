import { supabase } from './supabase';

export interface Officer {
  id: string;
  name: string;
  phone_mob: string;
  phone_office: string | null;
  rank: string;
  division_id: string | null;
  created_at: string;
  divisions?: { name: string; district: string } | null;
}

export interface OfficerInput {
  name: string;
  phone_mob: string;
  phone_office: string | null;
  rank: string;
  division_id: string | null;
}

export interface OfficerFilters {
  name?: string;
  phone?: string;
  rank?: string;
  division_id?: string;
}

export const RANKS = [
  'Inspector General of Police',
  'Deputy Inspector General',
  'Senior Superintendent',
  'Superintendent',
  'Chief Inspector',
  'Inspector',
  'Sub-Inspector',
  'Sergeant',
  'Corporal',
  'Constable',
];

export async function getOfficers(filters: OfficerFilters = {}): Promise<Officer[]> {
  let query = supabase
    .from('officers')
    .select('*, divisions(name, district)')
    .order('name');

  if (filters.division_id) query = query.eq('division_id', filters.division_id);
  if (filters.rank) query = query.eq('rank', filters.rank);
  if (filters.name) query = query.ilike('name', `%${filters.name}%`);
  if (filters.phone) {
    query = query.or(
      `phone_mob.ilike.%${filters.phone}%,phone_office.ilike.%${filters.phone}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Officer[];
}

export async function getOfficer(id: string): Promise<Officer> {
  const { data, error } = await supabase
    .from('officers')
    .select('*, divisions(name, district)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Officer;
}

export async function createOfficer(input: OfficerInput): Promise<Officer> {
  const { data, error } = await supabase
    .from('officers')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Officer;
}

export async function updateOfficer(id: string, input: OfficerInput): Promise<Officer> {
  const { data, error } = await supabase
    .from('officers')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Officer;
}

export async function deleteOfficer(id: string): Promise<void> {
  const { error } = await supabase.from('officers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
