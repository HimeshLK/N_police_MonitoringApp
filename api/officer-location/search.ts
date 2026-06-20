import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type SearchPayload = {
  reference: string;
  configName?: string;
  officerId?: string;
  timeRange: {
    start: number;
    end: number;
  };
};

function normalizeTimestamp(value: number): number {
  return value > 9999999999 ? Math.floor(value / 1000) : value;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are allowed.',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'SERVER_CONFIG_MISSING',
      message: 'Missing Supabase server configuration.',
    });
  }

  try {
    const payload = req.body as SearchPayload;

    if (!payload.reference?.trim()) {
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'reference is required.',
      });
    }

    if (
      !payload.timeRange ||
      !isValidNumber(payload.timeRange.start) ||
      !isValidNumber(payload.timeRange.end)
    ) {
      return res.status(400).json({
        error: 'INVALID_TIME_RANGE',
        message: 'timeRange.start and timeRange.end are required Unix timestamps.',
      });
    }

    const start = normalizeTimestamp(payload.timeRange.start);
    const end = normalizeTimestamp(payload.timeRange.end);

    if (end < start) {
      return res.status(400).json({
        error: 'INVALID_TIME_RANGE',
        message: 'timeRange.end must be greater than or equal to timeRange.start.',
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from('officer_location_events')
      .select(`
        id,
        reference,
        config_name,
        officer_external_id,
        officer_fname,
        officer_lname,
        lat,
        lng,
        device_mac,
        event_timestamp,
        event_time,
        created_at
      `)
      .eq('reference', payload.reference.trim())
      .gte('event_timestamp', start)
      .lte('event_timestamp', end)
      .order('event_timestamp', { ascending: true });

    if (payload.configName?.trim()) {
      query = query.eq('config_name', payload.configName.trim());
    }

    if (payload.officerId?.trim()) {
      query = query.eq('officer_external_id', payload.officerId.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Officer location search error:', error);

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to retrieve officer locations.',
      });
    }

    return res.status(200).json({
      reference: payload.reference.trim(),
      configName: payload.configName || null,
      officerId: payload.officerId || null,
      timeRange: {
        start,
        end,
      },
      count: data?.length || 0,
      locations: data || [],
    });
  } catch (error) {
    console.error('Officer location search API error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to retrieve officer locations.',
    });
  }
}