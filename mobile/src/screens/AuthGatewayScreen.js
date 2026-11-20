import { useEffect } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

import { Text } from '../components/AppText';
import { Button } from '../components/Button';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../theme/colors';
import { motion } from '../theme/motion';

const videoSource = require('../../assets/videos/auth_gateway.mp4');

// The clip is 16:9 on a flat light-grey studio colour. It is shown whole (never cropped, so the car
// and the GaadiGrid mark are always visible) on a hero tinted with that same colour, which keeps
// the edges invisible on every screen size.
const VIDEO_RATIO = 16 / 9;
const HERO_TINT = '#E2E6E9';
const MUTED_TEXT = '#667276';

/** Onboarding slides + this screen. Keep in step with OnboardingScreen's slide count. */
export const ONBOARDING_STEPS = 7;

function playSafely(player) {
  try {
    player.play();
  } catch {
    // the native player may already have been released while the screen unmounts
  }
}

function pauseSafely(player) {
  try {
    player.pause();
  } catch {
    // see above
  }
}

/**
 * Final onboarding step. It leads straight into authentication: Get Started opens sign-up, and
 * returning users can log in. The video is muted, looping, has no controls, and only plays while
 * the screen is focused, the app is in the foreground, and the user hasn't asked to reduce motion.
 */
export function AuthGatewayScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Play only while this screen is the one in front, and never in the background.
  useEffect(() => {
    let focused = true;
    const sync = () => {
      const foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
      if (focused && !reduced && foreground) playSafely(player);
      else pauseSafely(player);
    };
    sync();

    const offFocus = navigation.addListener?.('focus', () => {
      focused = true;
      sync();
    });
    const offBlur = navigation.addListener?.('blur', () => {
      focused = false;
      sync();
    });
    const appState = AppState.addEventListener('change', sync);

    return () => {
      offFocus?.();
      offBlur?.();
      appState.remove();
      pauseSafely(player);
    };
  }, [navigation, player, reduced]);

  const heroHeight = Math.round(Math.min(Math.max(height * 0.46, 300), 460));
  const videoHeight = Math.round(width / VIDEO_RATIO);

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top }]}>
        <FadeIn duration={motion.duration.slow} distance={0} style={styles.videoFrame}>
          <VideoView
            player={player}
            style={{ width, height: videoHeight }}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            testID="gateway-video"
          />
        </FadeIn>
      </View>

      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
        <View style={styles.body}>
          <FadeIn delay={200} style={styles.dots} accessibilityElementsHidden>
            {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
              <View key={i} style={[styles.dot, i === ONBOARDING_STEPS - 1 && styles.dotActive]} />
            ))}
          </FadeIn>

          <FadeIn delay={260}>
            <Text style={styles.headline} accessibilityRole="header">
              Step into Connected Mobility
            </Text>
            <Text style={styles.subtitle}>Seamlessly manage, secure, and connect your vehicle to the GaadiGrid ecosystem.</Text>
          </FadeIn>
        </View>

        <FadeIn delay={380} distance={8} style={styles.actions}>
          <Button size="lg" fullWidth rightIcon={<Icon name="arrowRight" />} onPress={() => navigation.navigate('Signup')} testID="gateway-get-started">
            Get Started
          </Button>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Button variant="link" size="sm" onPress={() => navigation.navigate('Login')} testID="gateway-login">
              Log in
            </Button>
          </View>

          <Button variant="ghost" size="sm" onPress={() => navigation.navigate('Help')} style={styles.help} testID="gateway-help">
            Need help?
          </Button>
        </FadeIn>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: HERO_TINT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  videoFrame: { alignItems: 'center', justifyContent: 'center' },
  sheet: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  body: { paddingTop: 22 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.green },
  headline: { color: colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
  subtitle: { color: MUTED_TEXT, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, paddingHorizontal: 4 },
  actions: { paddingBottom: 12 },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  loginText: { color: MUTED_TEXT, fontSize: 14 },
  help: { alignSelf: 'center', marginTop: 4 },
});
