import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { requestOtp } from '../api/authApi';
import { AuthPhoto } from '../components/AuthPhoto';
import { Button } from '../components/Button';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { LogoWordmark } from '../components/LogoWordmark';
import { TextField } from '../components/TextField';
import { colors } from '../theme/colors';
import { motion } from '../theme/motion';
import { isValidPhoneNumber, normalizePhoneInput } from '../utils/validators';

export function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendOtp() {
    const normalized = normalizePhoneInput(phone.trim());
    if (!isValidPhoneNumber(normalized)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await requestOtp(normalized);
      navigation.navigate('Otp', {
        phone: normalized,
        resendCooldownSeconds: result.resend_cooldown_seconds,
        devOtp: result.dev_otp,
      });
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Fields rise in one after another, a few tens of ms apart, once the photo has settled.
  const fieldDelay = (i) => 360 + i * motion.staggerTight;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthPhoto />

        <View style={styles.form}>
          <FadeIn delay={250}>
            <LogoWordmark size={36} variant="dark" />
            <Text style={styles.welcome}>Welcome to GaadiGrid</Text>
            <Text style={styles.tagline}>Everything around your car, connected in one place.</Text>
          </FadeIn>

          <FadeIn delay={fieldDelay(0)} distance={8}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Log in with your mobile number. We&apos;ll send you a one-time code.</Text>
          </FadeIn>

          <FadeIn delay={fieldDelay(1)} distance={8}>
            <TextField
              label="Mobile number"
              icon="phone"
              placeholder="98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={error}
              testID="phone-input"
            />
          </FadeIn>

          <FadeIn delay={fieldDelay(2)} distance={8}>
            <Button fullWidth onPress={handleSendOtp} loading={submitting} rightIcon={<Icon name="arrowRight" />} style={styles.cta}>
              Send OTP
            </Button>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>New to GaadiGrid?</Text>
              <Button variant="link" size="sm" onPress={() => navigation.navigate('Signup')}>Create an account</Button>
            </View>
          </FadeIn>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  form: { paddingHorizontal: 24, paddingTop: 24 },
  welcome: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 18 },
  tagline: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 26 },
  heading: { color: colors.textPrimary, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 6 },
  subheading: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  cta: { marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  switchText: { color: colors.textSecondary, fontSize: 13 },
});
