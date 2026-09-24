import { apiClient } from './client';

export function listNotifications(page = 1) {
  return apiClient.get('/api/v1/notifications', { params: { page, page_size: 20 } }).then((res) => res.data);
}

export function getUnreadCount() {
  return apiClient.get('/api/v1/notifications/unread-count').then((res) => res.data);
}

export function markNotificationRead(id) {
  return apiClient.post(`/api/v1/notifications/${id}/read`).then((res) => res.data);
}

export function markAllNotificationsRead() {
  return apiClient.post('/api/v1/notifications/read-all');
}

export function registerPushToken(token, platform) {
  return apiClient.post('/api/v1/notifications/push-token', { token, platform });
}

export function unregisterPushToken(token) {
  return apiClient.delete('/api/v1/notifications/push-token', { data: { token } });
}
