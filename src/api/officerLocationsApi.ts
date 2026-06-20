export type OfficerLocation = {
  id: string;
  reference: string;
  config_name: string;
  officer_external_id: string;
  officer_fname: string | null;
  officer_lname: string | null;
  lat: number;
  lng: number;
  device_mac: string | null;
  event_timestamp: number;
  event_time: string;
  created_at: string;
};

export async function getOfficerLocationsByRange(params: {
  reference: string;
  configName?: string;
  start: number;
  end: number;
}): Promise<OfficerLocation[]> {
  const searchParams = new URLSearchParams();

  searchParams.set('reference', params.reference);
  searchParams.set('start', String(params.start));
  searchParams.set('end', String(params.end));

  if (params.configName) {
    searchParams.set('configName', params.configName);
  }

  const response = await fetch(`/api/officer-location/search?${searchParams}`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.message || 'Unable to retrieve officer locations.'
    );
  }

  const result = await response.json();

  return result.locations || [];
}