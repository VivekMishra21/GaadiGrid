import { cloneElement, isValidElement } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { radius, shadow } from '../theme/tokens';
import { Text } from './AppText';

/**
 * GaadiGrid's one button (mobile).
 *
 *   <Button variant="primary" size="md" fullWidth loading={false} leftIcon={<Icon name="plus" />}>
 *     Book Service
 *   </Button>
 *
 * Variants: primary (emerald, the default CTA) · secondary · accent (orange, use sparingly) ·
 * dark · ghost · danger (destructive actions only) · link.
 * Sizes: sm 40 · md 48 · lg 52 · icon (48 square, needs accessibilityLabel).
 * Width: auto (content) or fullWidth — the screen decides, nothing screen-specific lives here.
 * States: default, hover (web), pressed, focus-visible (web/keyboard), disabled, loading.
 * Loading keeps the button's exact size: the label stays in the layout, hidden, under a spinner.
 */
const WHITE = '#FFFFFF';

const VARIANTS = {
  primary: { bg: colors.green, hover: colors.greenHover, pressed: colors.greenPressed, fg: WHITE, lift: shadow.green },
  secondary: { bg: colors.surface, hover: colors.greenSoft, pressed: '#D3EEE3', fg: colors.green, border: colors.green },
  accent: { bg: colors.orange, hover: colors.orangeHover, pressed: colors.orangePressed, fg: WHITE },
  dark: { bg: colors.ink, hover: colors.inkHover, pressed: colors.inkPressed, fg: WHITE },
  ghost: { bg: 'transparent', hover: colors.surfaceRaised, pressed: '#DDE5E2', fg: colors.textPrimary },
  danger: { bg: colors.error, hover: colors.errorHover, pressed: colors.errorPressed, fg: WHITE },
  link: { bg: 'transparent', hover: 'transparent', pressed: 'transparent', fg: colors.green },
};

const SIZES = {
  sm: { height: 40, paddingHorizontal: 16, fontSize: 14, weight: '600', gap: 6, icon: 16 },
  md: { height: 48, paddingHorizontal: 20, fontSize: 15, weight: '600', gap: 8, icon: 18 },
  lg: { height: 52, paddingHorizontal: 24, fontSize: 16, weight: '700', gap: 8, icon: 20 },
  icon: { height: 48, width: 48, paddingHorizontal: 0, fontSize: 15, weight: '600', gap: 0, icon: 20 },
};

// Keyboard/web focus ring (RN-web understands these; native ignores them).
const focusRing = Platform.select({
  web: { outlineWidth: 3, outlineStyle: 'solid', outlineColor: 'rgba(24,168,117,0.5)', outlineOffset: 2 },
  default: {},
});

function paint(node, color, size) {
  // Icons passed in take on the button's text colour, so callers never hard-code it.
  return isValidElement(node) ? cloneElement(node, { color: node.props.color ?? color, size: node.props.size ?? size }) : node;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  onPress,
  style,
  accessibilityLabel,
  testID,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isLink = variant === 'link';
  const iconOnly = size === 'icon';
  const blocked = disabled || loading;

  if (__DEV__ && iconOnly && !accessibilityLabel) {
    console.warn('<Button size="icon"> needs an accessibilityLabel so screen readers can name it.');
  }

  const label = typeof children === 'string' || typeof children === 'number' ? children : null;

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (label !== null ? String(label) : undefined)}
      accessibilityState={{ disabled: blocked, busy: loading }}
      testID={testID}
      // The visible control is 40px at the smallest size; extend the touch area to 44px.
      hitSlop={size === 'sm' || isLink ? { top: 3, bottom: 3, left: 3, right: 3 } : undefined}
      style={({ pressed, hovered, focused }) => [
        styles.base,
        {
          backgroundColor: pressed ? v.pressed : hovered ? v.hover : v.bg,
          borderColor: v.border || 'transparent',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isLink
          ? { height: undefined, minHeight: 0, paddingHorizontal: 0, paddingVertical: 2, borderRadius: radius.sm }
          : { height: s.height, width: s.width, paddingHorizontal: s.paddingHorizontal },
        v.lift && !blocked && v.lift,
        pressed && !isLink && { transform: [{ scale: 0.98 }] },
        focused && focusRing,
        blocked && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {({ hovered }) => (
        <>
          <View style={[styles.content, { gap: s.gap }, loading && styles.hidden]}>
            {paint(leftIcon, v.fg, s.icon)}
            {label !== null ? (
              <Text
                style={[
                  { color: v.fg, fontSize: s.fontSize, fontWeight: s.weight },
                  isLink && hovered && { textDecorationLine: 'underline' },
                ]}
              >
                {label}
              </Text>
            ) : (
              children
            )}
            {paint(rightIcon, v.fg, s.icon)}
          </View>
          {loading ? (
            <View style={styles.spinner} pointerEvents="none">
              <ActivityIndicator color={v.fg} size="small" />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  hidden: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
