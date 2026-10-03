import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

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
import { radius } from '../theme/tokens';
import { isValidEmail, isValidPhoneNumber, normalizePhoneInput } from '../utils/validators';

// Both consents are required by the backend for a new account; one checkbox records both.
export const SIGNUP_CONSENTS = [{ consent_type: 'terms_of_service' }, { consent_type: 'privacy_policy' }];

export function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    const name = fullName.trim();
    const normalized = normalizePhoneInput(phone.trim());
    const next = {};
    if (name.length < 2) next.fullName = 'Enter your full name.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!isValidPhoneNumber(normalized)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!agreed) next.consent = 'Please accept the Terms of Service and Privacy Policy to continue.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const result = await requestOtp(normalized);
      // The account is created (and the user signed in) when the OTP is verified on the next screen.
      navigation.navigate('Otp', {
        phone: normalized,
        resendCooldownSeconds: result.resend_cooldown_seconds,
        devOtp: result.dev_otp,
        signup: { fullName: name, email: email.trim(), consents: SIGNUP_CONSENTS },
      });
    } catch (err) {
      setErrors({ form: err.message || 'Could not send OTP. Please try again.' });
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
            <Text style={styles.heading}>Create Your Account</Text>
            <Text style={styles.subheading}>Join GaadiGrid and get started in minutes.</Text>
          </FadeIn>

          <FadeIn delay={fieldDelay(1)} distance={8}>
            <TextField
              label="Full name"
              icon="user"
              placeholder="Your name"
              autoCapitalize="words"
              autoComplete="name"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              testID="signup-name-input"
            />
          </FadeIn>
          <FadeIn delay={fieldDelay(2)} distance={8}>
            <TextField
              label="Email address"
              icon="mail"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              testID="signup-email-input"
            />
          </FadeIn>
          <FadeIn delay={fieldDelay(3)} distance={8}>
            <TextField
              label="Mobile number"
              icon="phone"
              placeholder="98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              testID="signup-phone-input"
            />
          </FadeIn>

          <FadeIn delay={fieldDelay(4)} distance={8}>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setAgreed((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
              testID="signup-consent"
            >
              <View style={[styles.box, agreed && styles.boxOn, !!errors.consent && !agreed && styles.boxError]}>
                {agreed ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.consentText}>I agree to GaadiGrid&apos;s Terms of Service and Privacy Policy.</Text>
            </TouchableOpacity>
            {errors.consent ? <Text style={styles.error}>{errors.consent}</Text> : null}
            {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
          </FadeIn>

          <FadeIn delay={fieldDelay(5)} distance={8}>
            <Button fullWidth onPress={handleSignup} loading={submitting} rightIcon={<Icon name="arrowRight" />} style={styles.cta}>
              Get Started
            </Button>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account?</Text>
              <Button variant="link" size="sm" onPress={() => navigation.navigate('Login')}>Log In</Button>
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
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, paddingVertical: 4 },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm / 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  boxError: { borderColor: colors.error },
  consentText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  error: { color: colors.error, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  cta: { marginTop: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  switchText: { color: colors.textSecondary, fontSize: 13 },
});
