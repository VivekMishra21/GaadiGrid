import { Alert, Platform } from 'react-native';

/**
 * Ask before doing something destructive. Alert.alert does nothing on react-native-web, so the
 * browser build falls back to window.confirm; native keeps the platform dialog.
 */
export function confirmAction({ title, message, confirmLabel = 'OK', onConfirm }) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
