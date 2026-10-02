"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError, setAuthToken, setOnAuthExpired } from "./client";
import type { TokenPair, User } from "./types";

// Only the access token (short-lived, 15 min) and the user object are kept here — the
// refresh token lives solely in the httpOnly cookie the backend sets, never in
// JS-readable storage, so an XSS on this site can't steal a 30-day-valid credential
// the way reading it out of localStorage would allow. Mirrors admin-web/provider-web's
// AuthContext pattern.
const STORAGE_KEY = "gaadigrid_website_session";

interface OtpRequestResult {
  phone: string;
  expires_in_seconds: number;
  resend_cooldown_seconds: number;
  dev_otp: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<OtpRequestResult>;
  verifyOtp: (
    phone: string,
    otp: string,
    signup?: { fullName: string }
  ) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnAuthExpired(() => {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    });

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { access, user: storedUser } = JSON.parse(stored);
        setAuthToken(access);
        // Deliberately deferred to this post-mount effect (not a lazy useState
        // initializer) so the server-rendered HTML always starts logged-out — reading
        // localStorage during render would desync from that and produce a hydration
        // mismatch on the header's login/account link.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(storedUser);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  async function requestOtp(phone: string) {
    return api.post<OtpRequestResult>("/api/v1/auth/otp/request", { phone });
  }

  async function verifyOtp(phone: string, otp: string, signup?: { fullName: string }) {
    const payload: Record<string, unknown> = { phone, otp };
    if (signup) {
      payload.full_name = signup.fullName;
      payload.consents = [
        { consent_type: "terms_of_service", version: "1.0" },
        { consent_type: "privacy_policy", version: "1.0" },
      ];
    }
    const res = await api.post<TokenPair>("/api/v1/auth/otp/verify", payload);
    setAuthToken(res.access_token);
    setUser(res.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ access: res.access_token, user: res.user }));
    return res.user;
  }

  function logout() {
    api.post("/api/v1/auth/logout", {}).catch(() => {
      // Best-effort server-side revoke; proceed with local sign-out regardless.
    });
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
