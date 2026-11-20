import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics are only for meaningful moments (picking a vehicle, a completed action). They are
// best-effort: unsupported devices and the web build simply do nothing.
const run = (fn) => {
  if (Platform.OS === 'web') return;
  try {
    Promise.resolve(fn()).catch(() => {});
  } catch {
    // ignore
  }
};

export const haptic = {
  select: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
