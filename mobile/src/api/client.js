import axios from 'axios';

import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';

const ACCESS_TOKEN_KEY = 'gaadigrid_access_token';
const REFRESH_TOKEN_KEY = 'gaadigrid_refresh_token';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

export async function getStoredTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    getSecureItem(ACCESS_TOKEN_KEY),
    getSecureItem(REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function storeTokens(accessToken, refreshToken) {
  await Promise.all([setSecureItem(ACCESS_TOKEN_KEY, accessToken), setSecureItem(REFRESH_TOKEN_KEY, refreshToken)]);
}

export async function clearTokens() {
  await Promise.all([deleteSecureItem(ACCESS_TOKEN_KEY), deleteSecureItem(REFRESH_TOKEN_KEY)]);
}

let isRefreshing = false;
let refreshWaiters = [];

function onRefreshed(newAccessToken) {
  refreshWaiters.forEach((resolve) => resolve(newAccessToken));
  refreshWaiters = [];
}

apiClient.interceptors.request.use(async (config) => {
  const { accessToken } = await getStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');

    if (status !== 401 || isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(normalizeError(error));
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshWaiters.push((newAccessToken) => {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const { refreshToken } = await getStoredTokens();
      if (!refreshToken) throw new Error('No refresh token available');

      const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken });
      const { access_token: newAccessToken, refresh_token: newRefreshToken } = res.data;
      await storeTokens(newAccessToken, newRefreshToken);

      isRefreshing = false;
      onRefreshed(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (_refreshError) {
      isRefreshing = false;
      refreshWaiters = [];
      await clearTokens();
      return Promise.reject(normalizeError(error));
    }
  }
);

function normalizeError(error) {
  const data = error.response?.data;
  if (data?.error) {
    return { code: data.error.code, message: data.error.message, details: data.error.details, status: error.response.status };
  }
  return { code: 'network_error', message: error.message || 'Network error. Please try again.', status: error.response?.status };
}
