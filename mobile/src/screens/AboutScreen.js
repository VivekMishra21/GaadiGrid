import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { WEBSITE_BASE_URL } from '../api/websiteApi';
import { ABOUT, HOW_IT_WORKS, WHY_GAADIGRID } from '../constants/content';
import { colors } from '../theme/colors';
import { BackButton } from '../components/BackButton';

export function AboutScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={() => navigation.goBack()} />

      <Text style={styles.heading}>{ABOUT.title}</Text>
      <Text style={styles.intro}>{ABOUT.intro}</Text>

      <View style={styles.blocks}>
        {ABOUT.blocks.map((block) => (
          <View key={block.title} style={styles.block}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{block.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>{block.title}</Text>
              <Text style={styles.blockBody}>{block.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.eyebrowOrange}>{HOW_IT_WORKS.eyebrow}</Text>
      <Text style={styles.subHeading}>{HOW_IT_WORKS.heading}</Text>
      <Text style={styles.intro}>{HOW_IT_WORKS.intro}</Text>
      <View style={styles.steps}>
        {HOW_IT_WORKS.steps.map((step) => (
          <View key={step.number} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>{step.title}</Text>
              <Text style={styles.blockBody}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.eyebrowGreen}>{WHY_GAADIGRID.eyebrow}</Text>
      <Text style={styles.subHeading}>{WHY_GAADIGRID.heading}</Text>
      {WHY_GAADIGRID.reasons.map((reason) => (
        <View key={reason.title} style={styles.reasonCard}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>{reason.icon}</Text>
          </View>
          <Text style={styles.blockTitle}>{reason.title}</Text>
          <Text style={styles.blockBody}>{reason.description}</Text>
        </View>
      ))}

      <View style={styles.legalRow}>
        <TouchableOpacity onPress={() => Linking.openURL(`${WEBSITE_BASE_URL}/privacy`)}>
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(`${WEBSITE_BASE_URL}/terms`)}>
          <Text style={styles.link}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  back: { color: colors.green, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  heading: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 10 },
  blocks: { marginTop: 24, marginBottom: 32, gap: 18 },
  block: { flexDirection: 'row', gap: 14 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(24,168,117,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  blockTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  blockBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  eyebrowOrange: { color: colors.orange, fontSize: 13, fontWeight: '700', marginTop: 8 },
  eyebrowGreen: { color: colors.green, fontSize: 13, fontWeight: '700', marginTop: 32 },
  subHeading: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 6 },
  steps: { marginTop: 18, gap: 18 },
  step: { flexDirection: 'row', gap: 14 },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.green, fontSize: 13, fontWeight: '800' },
  reasonCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 4,
  },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 36 },
  link: { color: colors.green, fontSize: 13, fontWeight: '600' },
});
