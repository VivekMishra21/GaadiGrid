import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';

// Smooth hover/press on web; native has no hover, so a tappable card just presses in slightly.
const webTransition = Platform.select({
  web: {
    transitionProperty: 'transform, box-shadow, border-color',
    transitionDuration: '220ms',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  default: {},
});

// The one surface used for grouped content: white, softly rounded, gently lifted.
export function Card({ children, onPress, style, tone = 'default', ...rest }) {
  const composed = [styles.card, tone === 'accent' && styles.accent, tone === 'flat' && styles.flat, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed, hovered }) => [
          composed,
          webTransition,
          hovered && styles.hovered,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={composed} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.card,
  },
  accent: { borderColor: 'rgba(24,168,117,0.35)', backgroundColor: colors.greenSoft },
  flat: { shadowOpacity: 0, elevation: 0 },
  hovered: { transform: [{ translateY: -3 }], borderColor: 'rgba(24,168,117,0.55)', shadowOpacity: 0.1 },
  pressed: { transform: [{ scale: 0.985 }] },
});
