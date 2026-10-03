import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { Accordion } from '../components/Accordion';
import { ContactForm } from '../components/ContactForm';
import { HELP_FAQS } from '../constants/content';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { BackButton } from '../components/BackButton';

export function HelpScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.heading}>Help &amp; Contact</Text>
        <Text style={styles.intro}>
          Questions about availability, a booking, or something else? Check the answers below, or send us a message.
        </Text>

        <View style={{ marginTop: 24 }}>
          <Accordion items={HELP_FAQS} />
        </View>

        <Text style={styles.subHeading}>Still stuck? Send us a message</Text>
        <ContactForm defaultName={user?.full_name || ''} defaultEmail={user?.email || ''} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  back: { color: colors.green, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  heading: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 10 },
  subHeading: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 32, marginBottom: 16 },
});
