import { apiClient } from './client';

export function listAddresses() {
  return apiClient.get('/api/v1/addresses').then((res) => res.data);
}

export function createAddress(payload) {
  return apiClient.post('/api/v1/addresses', payload).then((res) => res.data);
}
