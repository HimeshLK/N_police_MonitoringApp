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

type DashboardConfigScreen = {
  id: string;
  sort_order: number;
  enabled: boolean;
  interval_ms: number | null;
  route_allocations: RouteAllocation | RouteAllocation[] | null;
};

type ScreenResponse = {
  screenId: string;
  title: string;
  description: string;
  schedule: {
    start: string;
    end: string;
    millis: number;
  };
  enabled: boolean;
  interval: number;
  mapConfig: {
    lat: number;
    lng: number;
    zoom: number;
    params: unknown[];
    updateFrequency: number;
  };
};

function getSingleQueryValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getSingleHeaderValue(
  value: string | string[] | undefined
): string | undefined {
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
  return new Date(end).getTime() - new Date(start).getTime();
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

function resolveIntervalMs(
  configScreenInterval: number | null,
  routeUpdateFrequency: number | null | undefined
): number {
  if (
    typeof configScreenInterval === 'number' &&
    Number.isFinite(configScreenInterval) &&
    configScreenInterval > 0
  ) {
    return configScreenInterval;
  }

  if (
    typeof routeUpdateFrequency === 'number' &&
    Number.isFinite(routeUpdateFrequency) &&
    routeUpdateFrequency > 0
  ) {
    return routeUpdateFrequency;
  }

  return 18000;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
      const requestApiKey = getSingleHeaderValue(
        req.headers['x-config-api-key']
      );

      if (requestApiKey !== configApiKey) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid config API key.',
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const configName = getSingleQueryValue(req.query.configName);
    const includeDisabled =
      getSingleQueryValue(req.query.includeDisabled) === 'true';

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

    const { data: configScreens, error: configScreensError } = await supabase
      .from('dashboard_config_screens')
      .select(`
        id,
        sort_order,
        enabled,
        interval_ms,
        route_allocations (
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
        )
      `)
      .eq('dashboard_config_id', config.id)
      .order('sort_order', { ascending: true })
      .returns<DashboardConfigScreen[]>();

    if (configScreensError) {
      console.error(
        'Dashboard config screens query error:',
        configScreensError
      );

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to generate dashboard config screens.',
      });
    }

    const screens = (configScreens || [])
      .map((configScreen): ScreenResponse | null => {
        const route = getSingleRelation(configScreen.route_allocations);

        if (!route) return null;

        if (!includeDisabled && (!configScreen.enabled || !route.enabled)) {
          return null;
        }

        const schedule = getSingleRelation(route.schedules);

        const interval = resolveIntervalMs(
          configScreen.interval_ms,
          route.update_frequency_ms
        );

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
          enabled: route.enabled && configScreen.enabled,
          interval,
          mapConfig: {
            lat: route.center_lat,
            lng: route.center_lng,
            zoom: route.zoom_level,
            params: route.map_params || [],
            updateFrequency: interval,
          },
        };
      })
      .filter((screen): screen is ScreenResponse => screen !== null);

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