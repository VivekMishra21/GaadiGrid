import { apiClient } from './client';

export function searchProviders(params) {
  return apiClient.get('/api/v1/providers', { params }).then((res) => res.data);
}

export function getProvider(id) {
  return apiClient.get(`/api/v1/providers/${id}`).then((res) => res.data);
}

export function getAvailableSlots(providerId, packageId, date) {
  return apiClient
    .get(`/api/v1/providers/${providerId}/packages/${packageId}/available-slots`, { params: { date } })
    .then((res) => res.data);
}

export function getWeatherWarning(providerId, scheduledAt) {
  return apiClient
    .get(`/api/v1/providers/${providerId}/weather-warning`, { params: { scheduled_at: scheduledAt } })
    .then((res) => res.data);
}

export function listProviderReviews(providerId, page = 1) {
  return apiClient.get(`/api/v1/providers/${providerId}/reviews`, { params: { page, page_size: 20 } }).then((res) => res.data);
}
