import { apiClient } from './client';

// Fleet Pro is behind a server-side feature flag: while it is off every endpoint answers
// 404. `getMyFleet` turns that into `{ available: false }` so the app can hide the entry point.
export async function getMyFleet() {
  try {
    const account = await apiClient.get('/api/v1/fleet/mine').then((res) => res.data);
    return { available: true, account };
  } catch (err) {
    if (err?.status === 404) return { available: false, account: null };
    throw err;
  }
}

export function createFleet(companyName) {
  return apiClient.post('/api/v1/fleet', { company_name: companyName }).then((res) => res.data);
}

export function getFleetOverview(fleetId, months = 6) {
  return apiClient.get(`/api/v1/fleet/${fleetId}/overview`, { params: { months } }).then((res) => res.data);
}

export function attachFleetVehicle(fleetId, vehicleId) {
  return apiClient.post(`/api/v1/fleet/${fleetId}/vehicles/${vehicleId}/attach`).then((res) => res.data);
}

export function detachFleetVehicle(fleetId, vehicleId) {
  return apiClient.delete(`/api/v1/fleet/${fleetId}/vehicles/${vehicleId}`);
}

export function addFleetMember(fleetId, email, role) {
  return apiClient.post(`/api/v1/fleet/${fleetId}/members`, { email, role }).then((res) => res.data);
}

export function removeFleetMember(fleetId, userId) {
  return apiClient.delete(`/api/v1/fleet/${fleetId}/members/${userId}`);
}
