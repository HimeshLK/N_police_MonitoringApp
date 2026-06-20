import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeTimestamp(value: number): number {
  return value > 9999999999 ? Math.floor(value / 1000) : value;
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

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'SERVER_CONFIG_MISSING',
      message: 'Missing Supabase server configuration.',
    });
  }

  try {
    const reference = getQueryValue(req.query.reference);
    const configName = getQueryValue(req.query.configName);
    const officerId = getQueryValue(req.query.officerId);
    const startRaw = getQueryValue(req.query.start);
    const endRaw = getQueryValue(req.query.end);

    if (!reference?.trim()) {
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'reference query parameter is required.',
      });
    }

    const startNumber = Number(startRaw);
    const endNumber = Number(endRaw);

    if (!Number.isFinite(startNumber) || !Number.isFinite(endNumber)) {
      return res.status(400).json({
        error: 'INVALID_TIME_RANGE',
        message: 'start and end query parameters must be Unix timestamps.',
      });
    }

    const start = normalizeTimestamp(startNumber);
    const end = normalizeTimestamp(endNumber);

    if (end < start) {
      return res.status(400).json({
        error: 'INVALID_TIME_RANGE',
        message: 'end must be greater than or equal to start.',
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
      .eq('reference', reference.trim())
      .gte('event_timestamp', start)
      .lte('event_timestamp', end)
      .order('event_timestamp', { ascending: true });

    if (configName?.trim()) {
      query = query.eq('config_name', configName.trim());
    }

    if (officerId?.trim()) {
      query = query.eq('officer_external_id', officerId.trim());
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
      reference: reference.trim(),
      configName: configName || null,
      officerId: officerId || null,
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