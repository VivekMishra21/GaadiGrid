import { Easing, Platform } from 'react-native';

/**
 * GaadiGrid motion tokens (mobile). They mirror the website's src/lib/motion.ts so the app and
 * the site move with one voice: quick start, long soft landing, short distances.
 * Only transform + opacity are animated, so everything can run on the native driver.
 */
export const motion = {
  ease: Easing.bezier(0.22, 1, 0.36, 1),
  duration: {
    /** press / hover feedback */
    fast: 200,
    /** text blocks, cards */
    base: 450,
    /** larger groups */
    slow: 650,
    /** hero visuals */
    hero: 850,
  },
  /** points */
  distance: { sm: 12, md: 20 },
  /** ms between siblings */
  stagger: 80,
  staggerTight: 50,
};

// react-native-web has no native animation driver.
export const nativeDriver = Platform.OS !== 'web';

/** Delay for the nth item of a staggered group, capped so long lists never feel slow. */
export const staggerDelay = (index, base = 0, step = motion.stagger, cap = 6) => base + Math.min(index, cap) * step;
