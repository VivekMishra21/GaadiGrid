import { apiClient } from './client';

export function findProvidersForNeed({ need, lat, lng, radiusKm = 10 }) {
  return apiClient
    .get('/api/v1/pit-stop/needs', { params: { need, lat, lng, radius_km: radiusKm } })
    .then((res) => res.data);
}
