import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
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

  const configName = getQueryValue(req.query.configName);
  const reference = getQueryValue(req.query.reference);

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from('latest_officer_locations')
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
      .order('event_timestamp', { ascending: false });

    if (configName) {
      query = query.eq('config_name', configName);
    }

    if (reference) {
      query = query.eq('reference', reference);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Latest officer locations query error:', error);

      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to retrieve latest officer locations.',
      });
    }

    return res.status(200).json({
      configName: configName || null,
      reference: reference || null,
      count: data?.length || 0,
      officers: data || [],
    });
  } catch (error) {
    console.error('Latest officer locations API error:', error);

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to retrieve latest officer locations.',
    });
  }
}