import { apiClient } from './client';

export function createPaymentOrder(bookingId) {
  return apiClient.post(`/api/v1/bookings/${bookingId}/payment`).then((res) => res.data);
}

export function getPaymentOrder(bookingId) {
  return apiClient.get(`/api/v1/bookings/${bookingId}/payment`).then((res) => res.data);
}

export function devCompletePayment(orderId, success = true) {
  return apiClient.post(`/api/v1/payments/${orderId}/dev-complete`, null, { params: { success } }).then((res) => res.data);
}

export function listRefunds(bookingId) {
  return apiClient.get(`/api/v1/bookings/${bookingId}/refunds`).then((res) => res.data);
}
