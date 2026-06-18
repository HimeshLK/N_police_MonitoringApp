import { supabase } from './supabase';

export type DashboardOfficer = {
  id: string;
  name: string;
  rank: string;
};

export type DashboardSchedule = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

export type DashboardRouteAssignment = {
  id: string;
  status: 'on_duty' | 'standby' | 'off_duty';
  officer_id: string;
  officers: DashboardOfficer | DashboardOfficer[] | null;
};

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

  schedules: DashboardSchedule | DashboardSchedule[] | null;
  route_officer_assignments: DashboardRouteAssignment[] | null;
};

export type DashboardCounts = {
  totalOfficers: number;
  totalDivisions: number;
  activeRoutes: number;
  totalSchedules: number;
};

export async function getDashboardRoutes(): Promise<DashboardRoute[]> {
  const today = new Date().toISOString().slice(0, 10);

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
      update_frequency_ms,
      schedules (
        id,
        name,
        start_time,
        end_time
      ),
      route_officer_assignments (
        id,
        status,
        officer_id,
        officers (
          id,
          name,
          rank
        )
      )
    `)
    .eq('enabled', true)
    .eq('route_officer_assignments.assigned_date', today)
    .order('screen_id', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [
    officersResult,
    divisionsResult,
    routesResult,
    schedulesResult,
  ] = await Promise.all([
    supabase.from('officers').select('id', { count: 'exact', head: true }),
    supabase.from('divisions').select('id', { count: 'exact', head: true }),
    supabase
      .from('route_allocations')
      .select('id', { count: 'exact', head: true })
      .eq('enabled', true),
    supabase.from('schedules').select('id', { count: 'exact', head: true }),
  ]);

  if (officersResult.error) throw officersResult.error;
  if (divisionsResult.error) throw divisionsResult.error;
  if (routesResult.error) throw routesResult.error;
  if (schedulesResult.error) throw schedulesResult.error;

  return {
    totalOfficers: officersResult.count || 0,
    totalDivisions: divisionsResult.count || 0,
    activeRoutes: routesResult.count || 0,
    totalSchedules: schedulesResult.count || 0,
  };
}