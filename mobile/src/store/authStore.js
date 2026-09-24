import { create } from 'zustand';

import { fetchMe, logout as apiLogout, verifyOtp as apiVerifyOtp } from '../api/authApi';
import { clearTokens, getStoredTokens, storeTokens } from '../api/client';
import { unregisterCurrentPushToken } from '../utils/pushNotifications';

export const useAuthStore = create((set, get) => ({
  status: 'loading', // 'loading' | 'signed_out' | 'signed_in'
  user: null,
  error: null,

  async bootstrap() {
    const { accessToken } = await getStoredTokens();
    if (!accessToken) {
      set({ status: 'signed_out', user: null });
      return;
    }
    try {
      const user = await fetchMe();
      set({ status: 'signed_in', user });
    } catch {
      await clearTokens();
      set({ status: 'signed_out', user: null });
    }
  },

  async completeOtpLogin({ phone, otp, fullName, consents }) {
    set({ error: null });
    try {
      const result = await apiVerifyOtp({ phone, otp, fullName, consents });
      await storeTokens(result.access_token, result.refresh_token);
      set({ status: 'signed_in', user: result.user });
      return result;
    } catch (err) {
      set({ error: err });
      throw err;
    }
  },

  async logout() {
    const { refreshToken } = await getStoredTokens();
    await unregisterCurrentPushToken();
    try {
      if (refreshToken) await apiLogout(refreshToken);
    } catch {
      // Best-effort server-side revoke; proceed with local sign-out regardless.
    }
    await clearTokens();
    set({ status: 'signed_out', user: null });
  },

  setUser(user) {
    set({ user });
  },
}));
