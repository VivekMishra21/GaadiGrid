import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store wraps the OS Keychain/Keystore and has no web implementation.
// Web is only used here for dev/preview verification of this native app, never a
// shipping target, so it falls back to AsyncStorage — real devices always use
// SecureStore for tokens, per the security requirement.
const isWeb = Platform.OS === 'web';

export async function getSecureItem(key) {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

export async function setSecureItem(key, value) {
  return isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key) {
  return isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
}
