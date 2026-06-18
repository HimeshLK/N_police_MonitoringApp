import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';

// Minimal Vercel request/response shapes — avoids @vercel/node type dependency
interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
}
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

// Server-side only — SUPABASE_SERVICE_ROLE_KEY is never sent to the browser
const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function durationMillis(start: string, end: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

interface RouteRow {
  screen_id: string;
  title: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  map_params: unknown[];
  update_frequency_ms: number;
  enabled: boolean;
  // Supabase returns joined rows as an array for to-one relations
  schedules: Array<{ start_time: string; end_time: string }> | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' });
  }

  const configName = Array.isArray(req.query['configName'])
    ? req.query['configName'][0]
    : (req.query['configName'] ?? '');

  const includeDisabled =
    (Array.isArray(req.query['includeDisabled'])
      ? req.query['includeDisabled'][0]
      : req.query['includeDisabled']) === 'true';

  try {
    // 1. Fetch config — must exist and be enabled
    const { data: config, error: configError } = await supabase
      .from('dashboard_configs')
      .select('*')
      .eq('config_name', configName)
      .eq('enabled', true)
      .single();

    if (configError || !config) {
      return res.status(404).json({
        error: 'CONFIG_NOT_FOUND',
        message: 'Dashboard config was not found.',
      });
    }

    // 2. Fetch route allocations joined with schedules
    let query = supabase
      .from('route_allocations')
      .select(`
        screen_id,
        title,
        description,
        center_lat,
        center_lng,
        zoom_level,
        map_params,
        update_frequency_ms,
        enabled,
        schedules ( start_time, end_time )
      `)
      .eq('location_name', config.location as string)
      .order('screen_id');

    if (!includeDisabled) {
      query = query.eq('enabled', true);
    }

    const { data: routes, error: routesError } = await query;

    if (routesError) {
      console.error('Routes fetch error:', routesError.message);
      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to generate dashboard config.',
      });
    }

    // 3. Map to response shape
    const screens = (routes ?? []).map((r: RouteRow) => {
      // Supabase returns the joined schedule as a single-element array
      const schedule = Array.isArray(r.schedules) ? r.schedules[0] : r.schedules;
      const startTime = schedule?.start_time ?? '';
      const endTime = schedule?.end_time ?? '';
      return {
        screenId: r.screen_id,
        title: r.title,
        description: r.description ?? '',
        schedule: {
          start: startTime ? formatTime(startTime) : '',
          end: endTime ? formatTime(endTime) : '',
          millis: startTime && endTime ? durationMillis(startTime, endTime) : 0,
        },
        enabled: r.enabled,
        mapConfig: {
          lat: r.center_lat,
          lng: r.center_lng,
          zoom: r.zoom_level,
          params: r.map_params ?? [],
          updateFrequency: r.update_frequency_ms,
        },
      };
    });

    return res.status(200).json({
      configName: config.config_name,
      appName: config.app_name,
      configVersion: config.config_version,
      location: config.location,
      apiKey: config.api_key ?? '',
      screens,
    });
  } catch (err) {
    console.error('Config endpoint error:', err);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to generate dashboard config.',
    });
  }
}
