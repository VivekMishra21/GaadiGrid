import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { Text } from '../components/AppText';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';

export const ONBOARDING_SEEN_KEY = 'gaadigrid_onboarding_seen';

const homeHero = require('../../assets/images/home-hero.jpg');
const vehicleCareHero = require('../../assets/images/vehicle-care-hero.jpg');

const ECOSYSTEM = ['Fuel & CNG', 'Car Wash', 'Vehicle Care', 'Bookings', 'Expenses', 'Reminders', 'Alerts', 'Pit Stop'];
const CARE = ['AC Service', 'Denting & Painting', 'General Service', 'Tyre Service', 'Battery Service'];
const ACTIVITY = [
  { title: 'Expenses', body: 'Fuel, service and everything else you spend on this car.' },
  { title: 'Bookings', body: 'Every service you book, from request to completion.' },
  { title: 'Reminders', body: 'Insurance, PUC and service dates, before they lapse.' },
  { title: 'Notifications', body: 'Booking updates and reminders in one place.' },
  { title: 'Service activity', body: 'A growing history of what has been done.' },
];
const VEHICLE_FIELDS = ['Registration number', 'Make and model', 'Fuel type'];

function Ecosystem({ size }) {
  const radius = size / 2 - 40;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessible accessibilityLabel={`Your vehicle connects ${ECOSYSTEM.join(', ')}`}>
      <View style={[styles.ring, { width: radius * 2, height: radius * 2, borderRadius: radius, left: size / 2 - radius, top: size / 2 - radius }]} />
      {ECOSYSTEM.map((label, i) => {
        const angle = (i / ECOSYSTEM.length) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + radius * Math.cos(angle);
        const y = size / 2 + radius * Math.sin(angle);
        return (
          <View key={label} style={[styles.node, { left: x - 41, top: y - 15 }]}>
            <Text style={styles.nodeText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
      <View style={[styles.core, { left: size / 2 - 48, top: size / 2 - 30 }]}>
        <Text style={styles.coreText}>Your{'\n'}vehicle</Text>
      </View>
    </View>
  );
}

export function OnboardingScreen({ onDone }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const ecosystemSize = Math.min(width - 40, 330);
  // Explicit pixel size: inside a paging ScrollView, width:'100%' + aspectRatio doesn't resolve reliably on web.
  const photoWidth = width - 48;
  const photoStyle = { width: photoWidth, height: Math.round((photoWidth * 788) / 1400), borderRadius: 18, marginBottom: 24, alignSelf: 'center' };

  const slides = [
    {
      key: 'brand',
      render: () => (
        <>
          <Image source={homeHero} style={photoStyle} resizeMode="cover" accessibilityLabel="A GaadiGrid-mapped SUV driving past a fuel station" />
          <Text style={styles.title}>Everything around your car, connected in one place.</Text>
          <Text style={styles.body}>Fuel, car wash, vehicle care, bookings, expenses and reminders — all tied to your vehicle.</Text>
        </>
      ),
    },
    {
      key: 'connect',
      render: () => (
        <>
          <Text style={styles.eyebrow}>STEP 1</Text>
          <Text style={styles.title}>Let&apos;s start with your car.</Text>
          <Text style={styles.body}>
            Adding your vehicle lets GaadiGrid connect services, activity and reminders to that car. Right after you sign up, we&apos;ll ask for:
          </Text>
          <View style={styles.fieldList}>
            {VEHICLE_FIELDS.map((f) => (
              <View key={f} style={styles.fieldRow}>
                <View style={styles.fieldDot} />
                <Text style={styles.fieldText}>{f}</Text>
              </View>
            ))}
          </View>
        </>
      ),
    },
    {
      key: 'ecosystem',
      render: () => (
        <>
          <Text style={styles.title}>Your vehicle connects everything.</Text>
          <Ecosystem size={ecosystemSize} />
        </>
      ),
    },
    {
      key: 'care',
      render: () => (
        <>
          <Image source={vehicleCareHero} style={photoStyle} resizeMode="cover" accessibilityLabel="A technician inspecting an engine bay with a diagnostic tablet" />
          <Text style={styles.title}>One place for every kind of care.</Text>
          <View style={styles.pillWrap}>
            {CARE.map((c) => (
              <View key={c} style={styles.pill}>
                <Text style={styles.pillText}>{c}</Text>
              </View>
            ))}
          </View>
        </>
      ),
    },
    {
      key: 'activity',
      render: () => (
        <>
          <Text style={styles.title}>A history that grows with your car.</Text>
          <View style={styles.activity}>
            {ACTIVITY.map((a, i) => (
              <View key={a.title} style={styles.activityRow}>
                <View style={styles.rail}>
                  <View style={styles.railDot} />
                  {i < ACTIVITY.length - 1 ? <View style={styles.railLine} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={styles.activityTitle}>{a.title}</Text>
                  <Text style={styles.activityBody}>{a.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ),
    },
    {
      key: 'garage',
      render: () => (
        <>
          <Text style={styles.title}>Manage all your vehicles in one place.</Text>
          <Text style={styles.body}>
            Add more than one vehicle and switch between them anytime. Home, bookings, expenses and reminders follow the vehicle you pick.
          </Text>
          <View style={styles.pillWrap}>
            <View style={[styles.pill, styles.pillOn]}>
              <Text style={[styles.pillText, styles.pillOnText]}>Your car</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Another vehicle</Text>
            </View>
          </View>
        </>
      ),
    },
  ];

  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  async function finish(target = 'Signup') {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    onDone(target);
  }

  function goNext() {
    if (isLast) {
      finish('Signup');
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }

  return (
    <View style={styles.container}>
      {!isFirst ? (
        <TouchableOpacity style={styles.skip} onPress={() => finish('Signup')} accessibilityRole="button">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {slides.map((slide) => (
          <ScrollView key={slide.key} style={{ width }} contentContainerStyle={styles.slide}>
            {slide.render()}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((slide, i) => (
          <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Button fullWidth onPress={goNext} style={styles.cta}>{isFirst ? 'Get Started' : isLast ? 'Create your account' : 'Next'}</Button>
      {isFirst ? (
        <TouchableOpacity onPress={() => finish('Login')} style={styles.loginLink} accessibilityRole="button">
          <Text style={styles.loginText}>Log in</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.loginLinkSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 56 },
  skip: { position: 'absolute', top: 56, right: 20, zIndex: 1, padding: 6 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  slide: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12, flexGrow: 1, justifyContent: 'center' },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 33, marginBottom: 14 },
  body: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  fieldList: { marginTop: 22, alignSelf: 'center', gap: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  fieldText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  ring: { position: 'absolute', borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  node: {
    position: 'absolute',
    width: 82,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  core: {
    position: 'absolute',
    width: 96,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  pillOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  pillOnText: { color: '#FFFFFF' },
  activity: { marginTop: 10 },
  activityRow: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', width: 14 },
  railDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, marginTop: 5 },
  railLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  activityTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  activityBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.green, width: 20 },
  cta: { marginHorizontal: 24 },
  loginLink: { alignItems: 'center', paddingVertical: 14, marginBottom: 12 },
  loginText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  loginLinkSpacer: { height: 52 },
});
