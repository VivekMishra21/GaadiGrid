import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../theme/colors';
import { motion, nativeDriver } from '../theme/motion';
import { Logo } from './Logo';

/**
 * GaadiGrid's minimal loading state: the mark over a short stretch of road with an emerald
 * segment passing along it. It only shows after ~180ms, so quick loads never flash it, and it is
 * a calm placeholder, never a splash.
 */
export function LoadingMark({ label = 'Loading', style }) {
  const reduced = useReducedMotion();
  const appear = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fade = Animated.timing(appear, { toValue: 1, duration: 200, delay: 180, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver });
    fade.start();
    let loop;
    if (!reduced) {
      loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1100, easing: motion.ease, useNativeDriver: nativeDriver }));
      loop.start();
    }
    return () => {
      fade.stop();
      loop?.stop();
    };
  }, [appear, sweep, reduced]);

  return (
    <Animated.View accessibilityRole="progressbar" accessibilityLabel={label} style={[styles.wrap, { opacity: appear }, style]}>
      <Logo size={44} />
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.segment,
            reduced
              ? { width: '100%', opacity: 0.5 }
              : { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, 72] }) }] },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 36 },
  track: { width: 64, height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  segment: { width: 26, height: 3, borderRadius: 2, backgroundColor: colors.green },
});
