import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Switch, Text, TouchableOpacity } from 'react-native';

import { requestOtp } from '../api/authApi';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { isValidOtp } from '../utils/validators';

export function OtpScreen({ route }) {
  const { phone, resendCooldownSeconds } = route.params;
  const completeOtpLogin = useAuthStore((s) => s.completeOtpLogin);

  const [otp, setOtp] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(resendCooldownSeconds || 30);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  async function handleVerify() {
    if (!isValidOtp(otp)) {
      setError('Enter the code we sent you.');
      return;
    }
    if (needsProfile) {
      if (!fullName.trim()) {
        setError('Enter your name to continue.');
        return;
      }
      if (!acceptedTerms || !acceptedPrivacy) {
        setError('Please accept the Terms of Service and Privacy Policy to continue.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      const consents = needsProfile
        ? [{ consent_type: 'terms_of_service' }, { consent_type: 'privacy_policy' }]
        : [];
      await completeOtpLogin({ phone, otp, fullName: needsProfile ? fullName.trim() : undefined, consents });
    } catch (err) {
      if (err.code === 'validation_error') {
        setNeedsProfile(true);
        setError('Tell us a bit about yourself to finish creating your account.');
      } else {
        setError(err.message || 'Could not verify OTP. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      const result = await requestOtp(phone);
      setCooldown(result.resend_cooldown_seconds);
    } catch (err) {
      setError(err.message || 'Could not resend OTP.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.heading}>Verify your number</Text>
      <Text style={styles.subheading}>Enter the code sent to {phone}</Text>

      <TextField
        label="OTP"
        placeholder="123456"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={8}
        autoFocus
        testID="otp-input"
      />

      {needsProfile ? (
        <>
          <TextField label="Full name" placeholder="Your name" value={fullName} onChangeText={setFullName} testID="full-name-input" />

          <TouchableOpacity style={styles.consentRow} onPress={() => setAcceptedTerms((v) => !v)}>
            <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} trackColor={{ false: colors.border, true: colors.green }} />
            <Text style={styles.consentText}>I accept the Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.consentRow} onPress={() => setAcceptedPrivacy((v) => !v)}>
            <Switch value={acceptedPrivacy} onValueChange={setAcceptedPrivacy} trackColor={{ false: colors.border, true: colors.green }} />
            <Text style={styles.consentText}>I accept the Privacy Policy</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Verify" onPress={handleVerify} loading={submitting} style={styles.cta} />

      <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} style={styles.resend}>
        <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  consentText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 12,
  },
  cta: {
    marginTop: 4,
  },
  resend: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '600',
  },
  resendDisabled: {
    color: colors.textMuted,
  },
});
