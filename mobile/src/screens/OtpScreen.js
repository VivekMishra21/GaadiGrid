import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Switch, TouchableOpacity } from 'react-native';

import { Text } from '../components/AppText';
import { requestOtp } from '../api/authApi';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { isValidOtp } from '../utils/validators';

export function OtpScreen({ route }) {
  const { phone, resendCooldownSeconds, devOtp: initialDevOtp, signup } = route.params;
  const completeOtpLogin = useAuthStore((s) => s.completeOtpLogin);

  const [otp, setOtp] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(resendCooldownSeconds || 30);
  // Only present when the backend runs with the dev SMS provider (no real SMS is sent).
  const [devOtp, setDevOtp] = useState(initialDevOtp || null);
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
      // New accounts come from the Signup screen with name + consents already collected; a login
      // with an unregistered number falls back to asking for them here.
      const consents = signup ? signup.consents : needsProfile ? [{ consent_type: 'terms_of_service' }, { consent_type: 'privacy_policy' }] : [];
      const name = signup ? signup.fullName : needsProfile ? fullName.trim() : undefined;
      await completeOtpLogin({ phone, otp, fullName: name, email: signup?.email, consents });
    } catch (err) {
      if (err.code === 'validation_error') {
        setNeedsProfile(true);
        setError("We couldn't find an account for this number. Add your name to create one.");
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
      setDevOtp(result.dev_otp || null);
    } catch (err) {
      setError(err.message || 'Could not resend OTP.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.heading}>{signup ? 'Verify to create your account' : 'Verify your number'}</Text>
      <Text style={styles.subheading}>
        {signup ? `Hi ${signup.fullName.split(' ')[0]}! ` : ''}Enter the code sent to {phone}
      </Text>

      {devOtp ? (
        <TouchableOpacity onPress={() => setOtp(devOtp)} accessibilityRole="button" style={styles.devHint}>
          <Text style={styles.devHintText}>
            Dev mode: no SMS is sent. Your code is <Text style={styles.devCode}>{devOtp}</Text> (tap to fill)
          </Text>
        </TouchableOpacity>
      ) : null}

      <TextField
        label="OTP"
        icon="shieldCheck"
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

      <Button fullWidth onPress={handleVerify} loading={submitting} style={styles.cta}>{signup || needsProfile ? 'Verify & create account' : 'Verify'}</Button>

      <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} style={styles.resend}>
        <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  devHint: { backgroundColor: 'rgba(255,138,52,0.12)', borderRadius: 10, padding: 12, marginBottom: 16 },
  devHintText: { color: colors.textPrimary, fontSize: 13, lineHeight: 19 },
  devCode: { fontWeight: '800', letterSpacing: 2 },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
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
