import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type OfficerStatus = 'start' | 'in_progress' | 'stop';

type MobileLocationPayload = {
  createdAt: number;
  reference: string;
  status: OfficerStatus;
  configName: string;
  user: {
    fname?: string;
    lname?: string;
    id: string;
  };
  coordinates: {
    lat: number;
    lng?: number;
    log?: number;
  };
  device?: {
    mac?: string;
  };
};

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeTimestamp(value: number): {
  eventTimestamp: number;
  eventTimeIso: string;
} {
  const eventTimestamp = value > 9999999999 ? Math.floor(value / 1000) : value;

  return {
    eventTimestamp,
    eventTimeIso: new Date(eventTimestamp * 1000).toISOString(),
  };
}

function normalizeStatus(value: unknown): OfficerStatus | null {
  if (value === 'start') return 'start';
  if (value === 'in_progress') return 'in_progress';
  if (value === 'stop') return 'stop';

  return null;
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
  const ingestApiKey = process.env.LOCATION_INGEST_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'SERVER_CONFIG_MISSING',
      message: 'Missing Supabase server configuration.',
    });
  }

  if (!ingestApiKey || ingestApiKey.trim().length === 0) {
    return res.status(500).json({
      error: 'SERVER_CONFIG_MISSING',
      message: 'Missing LOCATION_INGEST_API_KEY.',
    });
  }

  const requestKey = getHeaderValue(req.headers['x-location-api-key']);

  if (requestKey !== ingestApiKey) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid location ingest API key.',
    });
  }

  try {
    const payload = req.body as MobileLocationPayload;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'Request body is required.',
      });
    }

    const status = normalizeStatus(payload.status);

    if (!status) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'status must be one of: start, in_progress, stop.',
      });
    }

    const lng = payload.coordinates?.lng ?? payload.coordinates?.log;

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

    if (!payload.user?.id?.trim()) {
      return res.status(400).json({
        error: 'INVALID_OFFICER_ID',
        message: 'user.id is required.',
      });
    }

    if (!isValidNumber(payload.createdAt)) {
      return res.status(400).json({
        error: 'INVALID_CREATED_AT',
        message: 'createdAt must be a Unix timestamp number.',
      });
    }

    if (
      !isValidNumber(payload.coordinates?.lat) ||
      payload.coordinates.lat < -90 ||
      payload.coordinates.lat > 90
    ) {
      return res.status(400).json({
        error: 'INVALID_LATITUDE',
        message: 'coordinates.lat must be between -90 and 90.',
      });
    }

    if (!isValidNumber(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: 'INVALID_LONGITUDE',
        message: 'coordinates.lng must be between -180 and 180.',
      });
    }

    const { eventTimestamp, eventTimeIso } = normalizeTimestamp(
      payload.createdAt
    );

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('officer_location_events')
      .insert({
        reference: payload.reference.trim(),
        config_name: payload.configName.trim(),

        officer_external_id: payload.user.id.trim(),
        officer_fname: payload.user.fname?.trim() || null,
        officer_lname: payload.user.lname?.trim() || null,

        status,

        lat: payload.coordinates.lat,
        lng,

        device_mac: payload.device?.mac || null,

        event_timestamp: eventTimestamp,
        event_time: eventTimeIso,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Officer location insert error:', error);

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to save officer location.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Officer location saved.',
      data,
    });
  } catch (error) {
    console.error('Officer location ingest error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to process officer location.',
    });
  }
}