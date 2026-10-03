import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { submitPartnerEnquiry } from '../api/websiteApi';
import { ChipGroup } from '../components/Chip';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { PARTNER } from '../constants/content';
import { colors } from '../theme/colors';
import { BackButton } from '../components/BackButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUSINESS_TYPE_OPTIONS = PARTNER.businessTypes.map((t) => ({ value: t, label: t }));

export function PartnerScreen({ navigation }) {
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: 'Noida',
    businessType: null,
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [status, setStatus] = useState('idle');

  function set(key) {
    return (value) => setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    const next = {};
    if (!form.businessName.trim()) next.businessName = 'Business name is required';
    if (!form.contactName.trim()) next.contactName = 'Your name is required';
    if (form.phone.trim().length < 6) next.phone = 'Enter a valid phone number';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.city.trim()) next.city = 'City is required';
    if (!form.businessType) next.businessType = 'Select a business type';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setApiError(null);
    setStatus('submitting');
    try {
      await submitPartnerEnquiry({
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        businessType: form.businessType,
        city: form.city.trim(),
        message: form.message.trim(),
      });
      setStatus('success');
    } catch (err) {
      setApiError(err.message);
      setStatus('idle');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={styles.eyebrow}>{PARTNER.eyebrow}</Text>
        <Text style={styles.heading}>{PARTNER.heading}</Text>
        <Text style={styles.intro}>{PARTNER.intro}</Text>

        {status === 'success' ? (
          <View style={styles.success}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>{PARTNER.successTitle}</Text>
            <Text style={styles.successBody}>{PARTNER.successBody}</Text>
          </View>
        ) : (
          <View style={styles.form}>
            <TextField label="Business name" value={form.businessName} onChangeText={set('businessName')} maxLength={200} error={errors.businessName} />
            <TextField label="Your name" value={form.contactName} onChangeText={set('contactName')} maxLength={120} error={errors.contactName} autoComplete="name" />
            <TextField label="Phone" value={form.phone} onChangeText={set('phone')} maxLength={20} keyboardType="phone-pad" error={errors.phone} />
            <TextField
              label="Email"
              value={form.email}
              onChangeText={set('email')}
              maxLength={200}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <TextField label="City" value={form.city} onChangeText={set('city')} maxLength={100} error={errors.city} />
            <ChipGroup
              label="Business type"
              options={BUSINESS_TYPE_OPTIONS}
              value={form.businessType}
              onChange={set('businessType')}
              error={errors.businessType}
            />
            <TextField
              label="Tell us more (optional)"
              value={form.message}
              onChangeText={set('message')}
              maxLength={1000}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.messageField}
            />
            {apiError ? <Text style={styles.error}>{apiError}</Text> : null}
            <Button fullWidth onPress={handleSubmit} loading={status === 'submitting'}>Become a Partner</Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  back: { color: colors.green, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  eyebrow: { color: colors.green, fontSize: 13, fontWeight: '700' },
  heading: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 6 },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 10 },
  form: { marginTop: 24 },
  messageField: { minHeight: 100 },
  error: { color: colors.error, fontSize: 13, marginBottom: 10 },
  success: {
    marginTop: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(24,168,117,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(24,168,117,0.35)',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  successIcon: { color: colors.green, fontSize: 36, fontWeight: '800' },
  successTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },
  successBody: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6 },
});
