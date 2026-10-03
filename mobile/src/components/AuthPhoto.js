import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { motion, nativeDriver } from '../theme/motion';
import { ResponsiveImage } from './ResponsiveImage';

const photo = require('../../assets/images/signup-hero.jpg');

/**
 * The hero photo shared by Log in and Sign up (same image as the website). It fades in with a very
 * small 1.02 → 1 settle and never moves again. The service icons are part of the photograph.
 */
export function AuthPhoto() {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return undefined;
    }
    const run = Animated.timing(progress, { toValue: 1, duration: 700, delay: 100, easing: motion.ease, useNativeDriver: nativeDriver });
    run.start();
    return () => run.stop();
  }, [reduced, progress]);

  return (
    <Animated.View
      style={[styles.frame, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }) }] }]}
    >
      <ResponsiveImage
        source={photo}
        ratio={1672 / 941}
        accessibilityLabel="A young GaadiGrid driver leaning on his white SUV outside a modern home, checking the app on his phone, with fuel, car wash, vehicle care, bookings, garage, expenses and reminders connected around the car"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#E2EDF3' },
});
