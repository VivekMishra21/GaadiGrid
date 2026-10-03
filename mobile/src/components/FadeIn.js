import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { motion, nativeDriver } from '../theme/motion';

/**
 * Fade + small rise, once, on mount. Wrap a logical block (a card, a heading + copy, one form
 * field) — not every line of text. Stagger siblings with `delay`. With reduced motion the content
 * simply shows.
 */
export function FadeIn({ children, delay = 0, distance = motion.distance.sm, duration = motion.duration.base, scaleFrom = 1, style, testID }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return undefined;
    }
    const run = Animated.timing(progress, { toValue: 1, duration, delay, easing: motion.ease, useNativeDriver: nativeDriver });
    run.start();
    return () => run.stop();
  }, [reduced, progress, delay, duration]);

  const transform = [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }];
  if (scaleFrom !== 1) transform.push({ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) });

  return (
    <Animated.View testID={testID} style={[{ opacity: progress, transform }, style]}>
      {children}
    </Animated.View>
  );
}
