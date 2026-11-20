import { Platform } from 'react-native';
import * as Device from 'expo-device';

const GB = 1024 * 1024 * 1024;

/**
 * 'high' when the device can comfortably run a live 3D scene, 'low' when it should get the
 * lightweight fallback instead. Android reports its RAM; iOS devices that run this app are all
 * capable enough, and the web build has no native GL surface.
 */
export function renderQualityFor({ os, totalMemory }) {
  if (os === 'web') return 'low';
  if (os === 'android' && typeof totalMemory === 'number' && totalMemory < 3.5 * GB) return 'low';
  return 'high';
}

export function useRenderQuality() {
  return renderQualityFor({ os: Platform.OS, totalMemory: Device.totalMemory });
}
