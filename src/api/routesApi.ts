import { supabase } from './supabase';

export interface RouteAllocation {
  id: string;
  schedule_id: string;
  screen_id: string;
  title: string;
  description: string | null;
  location_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  start_label: string | null;
  end_label: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  enabled: boolean;
  map_params: unknown[];
  update_frequency_ms: number;
  created_at: string;
  updated_at: string;
  schedules?: { name: string; start_time: string; end_time: string } | null;
}

export interface RouteAllocationInput {
  schedule_id: string;
  screen_id: string;
  title: string;
  description: string | null;
  location_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  start_label: string | null;
  end_label: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  enabled: boolean;
  map_params: unknown[];
  update_frequency_ms: number;
}

export async function getRoutes(): Promise<RouteAllocation[]> {
  const { data, error } = await supabase
    .from('route_allocations')
    .select('*, schedules(name, start_time, end_time)')
    .order('screen_id');

  if (error) throw new Error(error.message);
  return (data ?? []) as RouteAllocation[];
}

export async function getRoute(id: string): Promise<RouteAllocation> {
  const { data, error } = await supabase
    .from('route_allocations')
    .select('*, schedules(name, start_time, end_time)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as RouteAllocation;
}

export async function createRoute(input: RouteAllocationInput): Promise<RouteAllocation> {
  const { data, error } = await supabase
    .from('route_allocations')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RouteAllocation;
}

export async function updateRoute(id: string, input: RouteAllocationInput): Promise<RouteAllocation> {
  const { data, error } = await supabase
    .from('route_allocations')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RouteAllocation;
}

export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from('route_allocations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type DashboardRoute = {
  id: string;
  schedule_id: string;
  screen_id: string;
  title: string;
  description: string | null;
  location_name: string;

  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;

  start_label: string | null;
  end_label: string | null;

  center_lat: number;
  center_lng: number;

  zoom_level: number;
  enabled: boolean;
  update_frequency_ms: number;
};

export async function getDashboardRoutes(): Promise<DashboardRoute[]> {
  const { data, error } = await supabase
    .from('route_allocations')
    .select(`
      id,
      schedule_id,
      screen_id,
      title,
      description,
      location_name,
      start_lat,
      start_lng,
      end_lat,
      end_lng,
      start_label,
      end_label,
      center_lat,
      center_lng,
      zoom_level,
      enabled,
      update_frequency_ms
    `)
    .eq('enabled', true)
    .order('screen_id', { ascending: true });

  if (error) throw error;

  return data || [];
}