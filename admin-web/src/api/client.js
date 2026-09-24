const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let authToken = null;
let onAuthExpired = null;

export function setAuthToken(access) {
  authToken = access;
}

export function setOnAuthExpired(callback) {
  onAuthExpired = callback;
}

// The refresh token itself is never held here — it lives only in an httpOnly cookie
// the backend sets on login/refresh, so it's inaccessible to any JS running on this
// page (including a future XSS bug). `credentials: 'include'` is what makes the
// browser attach that cookie to same-site cross-origin requests to the API.
async function doRefresh() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('refresh failed');
  const data = await res.json();
  setAuthToken(data.access_token);
  return data.access_token;
}

let isRefreshing = false;
let refreshWaiters = [];

function onRefreshed(newAccessToken) {
  refreshWaiters.forEach((resolve) => resolve(newAccessToken));
  refreshWaiters = [];
}

async function request(path, options = {}, isRetry = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && !isRetry && !path.includes('/auth/')) {
    if (isRefreshing) {
      const newAccessToken = await new Promise((resolve) => refreshWaiters.push(resolve)).catch(() => null);
      if (newAccessToken) {
        headers.Authorization = `Bearer ${newAccessToken}`;
        return request(path, options, true);
      }
      if (onAuthExpired) onAuthExpired();
      return Promise.reject(normalizeError(res));
    }

    isRefreshing = true;
    try {
      const newAccessToken = await doRefresh();
      isRefreshing = false;
      onRefreshed(newAccessToken);
      return request(path, options, true);
    } catch {
      isRefreshing = false;
      refreshWaiters = [];
      if (onAuthExpired) onAuthExpired();
      return Promise.reject(normalizeError(res));
    }
  }

  if (res.status === 204) return undefined;

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code || 'unknown_error', err?.message || `Request failed (${res.status})`);
  }

  return body;
}

function normalizeError(res) {
  return new ApiError(res.status, 'session_expired', 'Your session has expired. Please sign in again.');
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: (path, body) => request(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
