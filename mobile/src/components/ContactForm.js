import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './AppText';
import { submitContactMessage } from '../api/websiteApi';
import { colors } from '../theme/colors';
import { Button } from './Button';
import { TextField } from './TextField';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({ defaultName = '', defaultEmail = '' }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [status, setStatus] = useState('idle');

  async function handleSubmit() {
    const next = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email';
    if (!subject.trim()) next.subject = 'Subject is required';
    if (!message.trim()) next.message = 'Message is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setApiError(null);
    setStatus('submitting');
    try {
      await submitContactMessage({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setStatus('success');
    } catch (err) {
      setApiError(err.message);
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <View style={styles.success}>
        <Text style={styles.successText}>Message sent — we&apos;ll get back to you soon.</Text>
      </View>
    );
  }

  return (
    <View>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={120} error={errors.name} autoComplete="name" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        maxLength={200}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />
      <TextField label="Subject" value={subject} onChangeText={setSubject} maxLength={150} error={errors.subject} />
      <TextField
        label="Message"
        value={message}
        onChangeText={setMessage}
        maxLength={2000}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={styles.messageField}
        error={errors.message}
      />
      {apiError ? <Text style={styles.error}>{apiError}</Text> : null}
      <Button fullWidth onPress={handleSubmit} loading={status === 'submitting'}>Send message</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  messageField: {
    minHeight: 110,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 10,
  },
  success: {
    backgroundColor: 'rgba(24,168,117,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(24,168,117,0.35)',
    borderRadius: 12,
    padding: 16,
  },
  successText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
