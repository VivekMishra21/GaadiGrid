import { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '../AppText';
import { IconBadge } from '../IconBadge';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/tokens';
import { motion, nativeDriver } from '../../theme/motion';
import { fuelLabel, vehicleTitle } from '../../utils/format';

const SURFACE = '#EEF3F1';

// A neutral side-on car, drawn once for every four-wheeler. It is a body-type illustration, not
// the user's model, and says so.
function CarIllustration({ width }) {
  const height = Math.round((width * 150) / 400);
  return (
    <Svg width={width} height={height} viewBox="0 0 400 150" accessible={false}>
      <Defs>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A4549" />
          <Stop offset="1" stopColor="#1F282B" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="200" cy="138" rx="168" ry="9" fill="#11181A" opacity="0.12" />
      <Path
        d="M16 108 C16 96 24 90 40 87 L84 80 C98 56 122 44 150 44 L246 44 C270 44 288 58 300 76 L344 82 C366 85 384 94 384 108 L384 118 L16 118 Z"
        fill="url(#body)"
      />
      <Path d="M104 78 C114 60 130 52 152 52 L186 52 L186 78 Z" fill="#9FB3BB" opacity="0.85" />
      <Path d="M196 52 L244 52 C260 52 272 62 282 78 L196 78 Z" fill="#9FB3BB" opacity="0.85" />
      <Circle cx="92" cy="118" r="31" fill={SURFACE} />
      <Circle cx="306" cy="118" r="31" fill={SURFACE} />
      <Circle cx="92" cy="118" r="26" fill="#11181A" />
      <Circle cx="306" cy="118" r="26" fill="#11181A" />
      <Circle cx="92" cy="118" r="12" fill="#C7D0D4" />
      <Circle cx="306" cy="118" r="12" fill="#C7D0D4" />
    </Svg>
  );
}

const ICON_FOR_TYPE = { BIKE: 'route', SCOOTER: 'route', AUTO_RICKSHAW: 'truck', COMMERCIAL: 'truck' };

/**
 * The garage's vehicle card when there is no 3D model (or the device is too modest for one). The
 * car sits on a soft stage with gentle horizontal parallax as you drag, so the card still feels
 * physical. The 3D viewer replaces it only when a real model exists for this exact vehicle.
 */
export function VehicleHero({ vehicle, width = 300, loading = false }) {
  const reduced = useReducedMotion();
  const shift = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return undefined;
    }
    const run = Animated.timing(enter, { toValue: 1, duration: motion.duration.slow, easing: motion.ease, useNativeDriver: nativeDriver });
    run.start();
    return () => run.stop();
  }, [reduced, enter]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => shift.setValue(Math.max(-14, Math.min(14, g.dx / 10))),
      onPanResponderRelease: () => Animated.spring(shift, { toValue: 0, useNativeDriver: nativeDriver, friction: 7 }).start(),
    })
  ).current;

  const isCar = !vehicle || vehicle.vehicle_type === 'CAR' || !vehicle.vehicle_type;

  return (
    <View
      style={styles.stage}
      accessible
      accessibilityRole="image"
      accessibilityLabel={vehicle ? `${vehicleTitle(vehicle)}, ${vehicle.registration_number}` : 'Your vehicle'}
      testID="vehicle-hero"
      {...(reduced ? {} : pan.panHandlers)}
    >
      <Animated.View
        style={{
          opacity: enter,
          transform: [
            { translateX: reduced ? 0 : shift },
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        }}
      >
        {isCar ? <CarIllustration width={width} /> : <IconBadge name={ICON_FOR_TYPE[vehicle.vehicle_type] || 'car'} size={72} />}
      </Animated.View>

      <View style={styles.meta}>
        {vehicle ? (
          <>
            <View style={styles.plate}>
              <Text style={styles.plateText}>{vehicle.registration_number}</Text>
            </View>
            <Text style={styles.fuel}>{fuelLabel(vehicle.fuel_type)}</Text>
          </>
        ) : null}
      </View>
      <Text style={styles.caption}>{loading ? 'Preparing 3D view…' : '3D view not available for this model yet'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: SURFACE, borderRadius: radius.lg, paddingTop: 22, paddingBottom: 14, alignItems: 'center', overflow: 'hidden' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  plate: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 },
  plateText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  fuel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  caption: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
});
