import { apiClient } from './client';

export function createBooking(payload) {
  return apiClient.post('/api/v1/bookings', payload).then((res) => res.data);
}

export function listMyBookings(page = 1, vehicleId = null) {
  const params = { page, page_size: 20 };
  if (vehicleId) params.vehicle_id = vehicleId;
  return apiClient.get('/api/v1/bookings/mine', { params }).then((res) => res.data);
}

export function cancelBooking(id, reason) {
  return apiClient.post(`/api/v1/bookings/${id}/cancel`, { reason }).then((res) => res.data);
}

export function getReview(bookingId) {
  return apiClient.get(`/api/v1/bookings/${bookingId}/review`).then((res) => res.data);
}

export function submitReview(bookingId, rating, comment) {
  return apiClient.post(`/api/v1/bookings/${bookingId}/review`, { rating, comment: comment || undefined }).then((res) => res.data);
}

export function raiseDispute(bookingId, reason) {
  return apiClient.post(`/api/v1/bookings/${bookingId}/dispute`, { reason }).then((res) => res.data);
}

export function listDisputes(bookingId) {
  return apiClient.get(`/api/v1/bookings/${bookingId}/disputes`).then((res) => res.data);
}
