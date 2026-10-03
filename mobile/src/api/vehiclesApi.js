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

export function listReminders(vehicleId) {
  const params = vehicleId ? { vehicle_id: vehicleId } : undefined;
  return apiClient.get('/api/v1/vehicles/reminders', { params }).then((res) => res.data);
}

export function getVehicleTimeline(vehicleId, limit = 50) {
  return apiClient.get(`/api/v1/vehicles/${vehicleId}/timeline`, { params: { limit } }).then((res) => res.data);
}

export function getVehicleCost(vehicleId, months = 6) {
  return apiClient.get(`/api/v1/vehicles/${vehicleId}/cost`, { params: { months } }).then((res) => res.data);
}

export function getVehiclePassport(vehicleId) {
  return apiClient.get(`/api/v1/vehicles/${vehicleId}/passport`).then((res) => res.data);
}

export function listServiceRecords(vehicleId, page = 1) {
  return apiClient.get(`/api/v1/vehicles/${vehicleId}/service-records`, { params: { page, page_size: 50 } }).then((res) => res.data);
}

export function createServiceRecord(vehicleId, payload) {
  return apiClient.post(`/api/v1/vehicles/${vehicleId}/service-records`, payload).then((res) => res.data);
}

export function updateServiceRecord(recordId, payload) {
  return apiClient.put(`/api/v1/service-records/${recordId}`, payload).then((res) => res.data);
}

export function deleteServiceRecord(recordId) {
  return apiClient.delete(`/api/v1/service-records/${recordId}`);
}
