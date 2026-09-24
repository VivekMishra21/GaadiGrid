import { apiClient } from './client';

export function requestOtp(phone) {
  return apiClient.post('/api/v1/auth/otp/request', { phone }).then((res) => res.data);
}

export function verifyOtp({ phone, otp, fullName, consents }) {
  return apiClient
    .post('/api/v1/auth/otp/verify', {
      phone,
      otp,
      full_name: fullName,
      consents: consents || [],
    })
    .then((res) => res.data);
}

export function fetchMe() {
  return apiClient.get('/api/v1/auth/me').then((res) => res.data);
}

export function logout(refreshToken) {
  return apiClient.post('/api/v1/auth/logout', { refresh_token: refreshToken });
}

export function requestDeleteAccount(reason) {
  return apiClient.post('/api/v1/auth/delete-account', { reason });
}
