import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken, unregisterPushToken } from '../api/notificationsApi';

function platformName() {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
}

/** Best-effort: requests permission and registers the device's Expo push token with
 * the backend. Never throws — reminders/notifications remain fully usable in-app even
 * if push delivery isn't set up (denied permission, running in a simulator, web, etc). */
export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(token, platformName());
    return token;
  } catch {
    return null;
  }
}

export async function unregisterCurrentPushToken() {
  try {
    if (!Device.isDevice) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await unregisterPushToken(token);
  } catch {
    // best-effort; the token will simply go stale server-side
  }
}
