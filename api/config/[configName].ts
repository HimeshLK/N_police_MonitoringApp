import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type DashboardConfig = {
  id: string;
  config_name: string;
  app_name: string;
  config_version: string;
  location: string;
  api_key: string | null;
  enabled: boolean;
};

type Schedule = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type RouteAllocation = {
  id: string;
  screen_id: string;
  title: string;
  description: string | null;
  location_name: string;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  enabled: boolean;
  map_params: unknown[] | null;
  update_frequency_ms: number;
  schedules: Schedule | Schedule[] | null;
};

function getSingleQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getSingleHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Colombo',
  });
}

function durationMillis(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return endDate.getTime() - startDate.getTime();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET requests are allowed.',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const configApiKey = process.env.CONFIG_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'SERVER_CONFIG_MISSING',
      message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  try {
    if (configApiKey && configApiKey.trim().length > 0) {
      const requestApiKey = getSingleHeaderValue(req.headers['x-config-api-key']);

      if (requestApiKey !== configApiKey) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid config API key.',
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const configName = getSingleQueryValue(req.query.configName);
    const locationFilter = getSingleQueryValue(req.query.location);
    const includeDisabled = getSingleQueryValue(req.query.includeDisabled) === 'true';

    if (!configName) {
      return res.status(400).json({
        error: 'INVALID_CONFIG_NAME',
        message: 'Config name is required.',
      });
    }

    const { data: config, error: configError } = await supabase
      .from('dashboard_configs')
      .select('*')
      .eq('config_name', configName)
      .eq('enabled', true)
      .maybeSingle<DashboardConfig>();

    if (configError) {
      console.error('Dashboard config query error:', configError);

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to read dashboard config.',
      });
    }

    if (!config) {
      return res.status(404).json({
        error: 'CONFIG_NOT_FOUND',
        message: 'Dashboard config was not found.',
      });
    }

    let routeQuery = supabase
      .from('route_allocations')
      .select(`
        id,
        screen_id,
        title,
        description,
        location_name,
        center_lat,
        center_lng,
        zoom_level,
        enabled,
        map_params,
        update_frequency_ms,
        schedules (
          id,
          name,
          start_time,
          end_time
        )
      `)
      .eq('location_name', locationFilter || config.location)
      .order('screen_id', { ascending: true });

    if (!includeDisabled) {
      routeQuery = routeQuery.eq('enabled', true);
    }

    const { data: routes, error: routesError } = await routeQuery.returns<RouteAllocation[]>();

    if (routesError) {
      console.error('Route allocations query error:', routesError);

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to generate dashboard config.',
      });
    }

    const screens = (routes || []).map((route) => {
      const schedule = Array.isArray(route.schedules)
        ? route.schedules[0]
        : route.schedules;

      return {
        screenId: route.screen_id,
        title: route.title,
        description: route.description || '',
        schedule: {
          start: schedule ? formatTime(schedule.start_time) : '',
          end: schedule ? formatTime(schedule.end_time) : '',
          millis: schedule
            ? durationMillis(schedule.start_time, schedule.end_time)
            : 0,
        },
        enabled: route.enabled,
        mapConfig: {
          lat: route.center_lat,
          lng: route.center_lng,
          zoom: route.zoom_level,
          params: route.map_params || [],
          updateFrequency: route.update_frequency_ms,
        },
      };
    });

    return res.status(200).json({
      configName: config.config_name,
      appName: config.app_name,
      configVersion: config.config_version,
      location: config.location,
      apiKey: config.api_key || '',
      screens,
    });
  } catch (error) {
    console.error('Dashboard config API error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to generate dashboard config.',
    });
  }
}