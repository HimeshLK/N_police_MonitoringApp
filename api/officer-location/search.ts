import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type OfficerStatus = 'start' | 'running' | 'stop';

type OfficerLocationSearchPayload = {
  reference: string;
  configName: string;
  timeRange: {
    start: number;
    end: number;
  };
};

type OfficerLocationRow = {
  reference: string;
  config_name: string;
  officer_external_id: string;
  officer_fname: string | null;
  officer_lname: string | null;
  status: OfficerStatus;
  lat: number;
  lng: number;
  device_mac: string | null;
  event_timestamp: number;
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
    const payload = req.body as OfficerLocationSearchPayload;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'Request body is required.',
      });
    }

    if (!payload.reference?.trim()) {
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'reference is required.',
      });
    }

    if (!payload.configName?.trim()) {
      return res.status(400).json({
        error: 'INVALID_CONFIG_NAME',
        message: 'configName is required.',
      });
    }

    if (
      !payload.timeRange ||
      !isValidNumber(payload.timeRange.start) ||
      !isValidNumber(payload.timeRange.end)
    ) {
      return res.status(400).json({
        error: 'INVALID_TIME_RANGE',
        message:
          'timeRange.start and timeRange.end are required Unix timestamps.',
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

    const { data, error } = await supabase
      .from('officer_location_events')
      .select(`
        reference,
        config_name,
        officer_external_id,
        officer_fname,
        officer_lname,
        status,
        lat,
        lng,
        device_mac,
        event_timestamp
      `)
      .eq('reference', payload.reference.trim())
      .eq('config_name', payload.configName.trim())
      .gte('event_timestamp', start)
      .lte('event_timestamp', end)
      .order('event_timestamp', { ascending: false })
      .returns<OfficerLocationRow[]>();

    if (error) {
      console.error('Officer location search error:', error);

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to retrieve officer locations.',
      });
    }

    const latestByOfficer = new Map<string, OfficerLocationRow>();

    for (const item of data || []) {
      const officerId = item.officer_external_id;
      const existing = latestByOfficer.get(officerId);

      if (!existing || item.event_timestamp > existing.event_timestamp) {
        latestByOfficer.set(officerId, item);
      }
    }

    const responsePayload = Array.from(latestByOfficer.values())
      .filter((item) => item.status !== 'stop')
      .map((item) => ({
        createdAt: item.event_timestamp,
        reference: item.reference,
        status: item.status,
        configName: item.config_name,
        user: {
          fname: item.officer_fname || '',
          lname: item.officer_lname || '',
          id: item.officer_external_id,
        },
        coordinates: {
          lat: item.lat,
          lng: item.lng,
        },
        device: {
          mac: item.device_mac || '',
        },
      }));

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Officer location search API error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to retrieve officer locations.',
    });
  }
}