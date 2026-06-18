import { supabase } from './supabase';

export interface Schedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface ScheduleInput {
  name: string;
  start_time: string;
  end_time: string;
}

export async function getSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('start_time');

  if (error) throw new Error(error.message);
  return (data ?? []) as Schedule[];
}

export async function getSchedule(id: string): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Schedule;
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Schedule;
}

export async function updateSchedule(id: string, input: ScheduleInput): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Schedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
