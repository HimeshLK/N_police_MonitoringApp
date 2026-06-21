import { useJsApiLoader } from '@react-google-maps/api';

export function useGoogleMapsLoader() {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const loader = useJsApiLoader({
    id: 'script-loader',
    googleMapsApiKey,
  });

  return {
    googleMapsApiKey,
    ...loader,
  };
}