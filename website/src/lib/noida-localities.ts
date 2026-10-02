// GaadiGrid is launching in Noida first. These are the localities we actually have
// real seeded station/provider coverage for (see backend/app/workers/seed.py) — kept
// in sync with that file rather than treated as a general-purpose geocoder, since we
// don't have a Google Places API key wired up yet (see NEXT_PUBLIC_API_BASE_URL notes).
export interface NoidaLocality {
  label: string;
  latitude: number;
  longitude: number;
}

export const NOIDA_LOCALITIES: NoidaLocality[] = [
  { label: "Sector 18, Noida", latitude: 28.5708, longitude: 77.326 },
  { label: "Sector 62, Noida", latitude: 28.6273, longitude: 77.372 },
  { label: "Sector 44, Noida", latitude: 28.5691, longitude: 77.391 },
  { label: "Sector 37, Noida", latitude: 28.5691, longitude: 77.3313 },
  { label: "Sector 15, Noida", latitude: 28.5847, longitude: 77.3151 },
  { label: "Sector 71, Noida", latitude: 28.5963, longitude: 77.3606 },
];

export const DEFAULT_NOIDA_CENTER = NOIDA_LOCALITIES[0];
