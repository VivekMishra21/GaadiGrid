const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAuthToken(access: string | null) {
  authToken = access;
}

export function setOnAuthExpired(callback: (() => void) | null) {
  onAuthExpired = callback;
}

// The refresh token itself is never held here — it lives only in an httpOnly cookie the
// backend sets on login/refresh, so it's inaccessible to any JS running on this page
// (including a future XSS bug). `credentials: 'include'` is what makes the browser
// attach that cookie to requests to the API's origin.
async function doRefresh(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = await res.json();
  setAuthToken(data.access_token);
  return data.access_token as string;
}

let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function onRefreshed(newAccessToken: string) {
  refreshWaiters.forEach((resolve) => resolve(newAccessToken));
  refreshWaiters = [];
}

function normalizeError(res: Response) {
  return new ApiError(res.status, "session_expired", "Your session has expired. Please sign in again.");
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: "include" });

  if (res.status === 401 && !isRetry && !path.includes("/auth/")) {
    if (isRefreshing) {
      const newAccessToken = await new Promise<string | null>((resolve) => refreshWaiters.push(resolve)).catch(
        () => null
      );
      if (newAccessToken) {
        return request<T>(path, options, true);
      }
      onAuthExpired?.();
      return Promise.reject(normalizeError(res));
    }

    isRefreshing = true;
    try {
      const newAccessToken = await doRefresh();
      isRefreshing = false;
      onRefreshed(newAccessToken);
      return request<T>(path, options, true);
    } catch {
      isRefreshing = false;
      refreshWaiters = [];
      onAuthExpired?.();
      return Promise.reject(normalizeError(res));
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code || "unknown_error", err?.message || `Request failed (${res.status})`);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
