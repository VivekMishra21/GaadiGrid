import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { requestOtp } from '../api/authApi';
import { LogoWordmark } from '../components/LogoWordmark';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { colors } from '../theme/colors';
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
      navigation.navigate('Otp', { phone: normalized, resendCooldownSeconds: result.resend_cooldown_seconds });
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <LogoWordmark size={44} variant="dark" showTagline />
      </View>

      <Text style={styles.heading}>Enter your mobile number</Text>
      <Text style={styles.subheading}>We&apos;ll send you a one-time code to verify it&apos;s you.</Text>

      <TextField
        label="Mobile number"
        placeholder="98765 43210"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={error}
        autoFocus
        testID="phone-input"
      />

      <PrimaryButton title="Send OTP" onPress={handleSendOtp} loading={submitting} style={styles.cta} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  brand: {
    marginBottom: 40,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 24,
  },
  cta: {
    marginTop: 4,
  },
});
