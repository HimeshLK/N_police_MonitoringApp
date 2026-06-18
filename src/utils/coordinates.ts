export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function calculateMidpoint(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): { lat: number; lng: number } {
  return {
    lat: (startLat + endLat) / 2,
    lng: (startLng + endLng) / 2,
  };
}

export function parseLatLng(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',').map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!isValidLat(lat) || !isValidLng(lng)) return null;
  return { lat, lng };
}
