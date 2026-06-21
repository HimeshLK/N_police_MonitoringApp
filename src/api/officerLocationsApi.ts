export type OfficerLocation = {
  createdAt: number;
  reference: string;
  configName: string;
  user: {
    fname: string;
    lname: string;
    id: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  device: {
    mac: string;
  };
};

export async function getOfficerLocationsByRange(params: {
  reference: string;
  configName: string;
  start: number;
  end: number;
}): Promise<OfficerLocation[]> {
  const response = await fetch('/api/officer-location/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference: params.reference,
      configName: params.configName,
      timeRange: {
        start: params.start,
        end: params.end,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.message || 'Unable to retrieve officer locations.'
    );
  }

  const result = await response.json();

  return Array.isArray(result) ? result : [];
}