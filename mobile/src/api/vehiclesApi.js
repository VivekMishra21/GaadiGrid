import { apiClient } from './client';

export function listVehicles() {
  return apiClient.get('/api/v1/vehicles').then((res) => res.data);
}

export function createVehicle(payload) {
  return apiClient.post('/api/v1/vehicles', payload).then((res) => res.data);
}

export function updateVehicle(id, payload) {
  return apiClient.put(`/api/v1/vehicles/${id}`, payload).then((res) => res.data);
}

export function deleteVehicle(id) {
  return apiClient.delete(`/api/v1/vehicles/${id}`);
}

export function listReminders() {
  return apiClient.get('/api/v1/vehicles/reminders').then((res) => res.data);
}
