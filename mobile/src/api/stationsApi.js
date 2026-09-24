import { apiClient } from './client';

export function searchStations(params) {
  return apiClient.get('/api/v1/stations', { params }).then((res) => res.data);
}

export function getStation(id) {
  return apiClient.get(`/api/v1/stations/${id}`).then((res) => res.data);
}

export function listFavoriteStations() {
  return apiClient.get('/api/v1/stations/favorites/mine').then((res) => res.data);
}

export function toggleFavoriteStation(id) {
  return apiClient.post(`/api/v1/stations/${id}/favorite`).then((res) => res.data);
}

export function listFuelTypes() {
  return apiClient.get('/api/v1/fuel-types').then((res) => res.data);
}

export function submitQueueReport(stationId, payload) {
  return apiClient.post(`/api/v1/stations/${stationId}/queue-reports`, payload).then((res) => res.data);
}

export function flagQueueReport(reportId) {
  return apiClient.post(`/api/v1/queue-reports/${reportId}/flag`);
}
