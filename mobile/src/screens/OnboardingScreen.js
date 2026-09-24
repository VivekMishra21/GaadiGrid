import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
export const ONBOARDING_SEEN_KEY = 'gaadigrid_onboarding_seen';

const SLIDES = [
  {
    title: 'Find fuel, live',
    body: 'Locate petrol, diesel, CNG and EV stations nearby, with current prices and reported queue times.',
  },
  {
    title: 'Book car care',
    body: 'Doorstep or workshop washing, detailing and vehicle-care services, booked in a few taps.',
  },
  {
    title: 'Stay on top of your vehicle',
    body: 'Track fuel spend, insurance, PUC and service reminders so nothing sneaks up on you.',
  },
];

export function OnboardingScreen({ onDone }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    onDone();
  }

  function goNext() {
    if (isLast) {
      finish();
      return;
    }
    const nextIndex = index + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={finish} accessibilityRole="button">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <PrimaryButton title={isLast ? 'Get started' : 'Next'} onPress={goNext} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 60,
  },
  skip: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.green,
    width: 20,
  },
  cta: {
    marginHorizontal: 32,
    marginBottom: 32,
  },
});
