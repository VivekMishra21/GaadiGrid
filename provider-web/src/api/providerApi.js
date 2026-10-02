import { api } from './client';

export const getMyProvider = () => api.get('/api/v1/providers/mine');
export const createProvider = (payload) => api.post('/api/v1/providers', payload);
export const updateProvider = (id, payload) => api.put(`/api/v1/providers/${id}`, payload);

export const getAvailability = (providerId) => api.get(`/api/v1/providers/${providerId}/availability`);
export const updateAvailability = (providerId, days) =>
  api.put(`/api/v1/providers/${providerId}/availability`, { days });

export const createPackage = (providerId, payload) => api.post(`/api/v1/providers/${providerId}/packages`, payload);
export const updatePackage = (providerId, packageId, payload) =>
  api.put(`/api/v1/providers/${providerId}/packages/${packageId}`, payload);

export const listMyBookings = (page = 1) => api.get(`/api/v1/bookings/provider/mine?page=${page}&page_size=20`);
export const getBookingReport = () => api.get('/api/v1/bookings/provider/mine/report');
export const confirmBooking = (id) => api.post(`/api/v1/bookings/${id}/confirm`);
export const rejectBooking = (id, reason) => api.post(`/api/v1/bookings/${id}/reject`, { reason });
export const startBooking = (id) => api.post(`/api/v1/bookings/${id}/start`);
export const completeBooking = (id) => api.post(`/api/v1/bookings/${id}/complete`);
export const cancelBooking = (id, reason) => api.post(`/api/v1/bookings/${id}/cancel`, { reason });

export const listMySettlements = (providerId, page = 1) =>
  api.get(`/api/v1/providers/${providerId}/settlements?page=${page}&page_size=20`);

export const submitVerification = (providerId, payload) =>
  api.post(`/api/v1/providers/${providerId}/verification/submit`, payload);

export const listStaff = (providerId) => api.get(`/api/v1/providers/${providerId}/staff`);
export const addStaff = (providerId, email) => api.post(`/api/v1/providers/${providerId}/staff`, { email });
export const removeStaff = (providerId, userId) => api.delete(`/api/v1/providers/${providerId}/staff/${userId}`);

export const listProviderReviews = (providerId, page = 1) =>
  api.get(`/api/v1/providers/${providerId}/reviews?page=${page}&page_size=20`);
export const respondToReview = (bookingId, response) =>
  api.post(`/api/v1/bookings/${bookingId}/review/response`, { response });
