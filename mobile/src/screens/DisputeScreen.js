import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { listDisputes, raiseDispute } from '../api/bookingsApi';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { colors } from '../theme/colors';

const STATUS_LABEL = {
  OPEN: 'Open — under review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DisputeScreen({ route, navigation }) {
  const { bookingId, packageName } = route.params;
  const [disputes, setDisputes] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    listDisputes(bookingId)
      .then(setDisputes)
      .catch(() => setDisputes([]));
  }

  useEffect(load, [bookingId]);

  const hasOpenDispute = (disputes || []).some((d) => d.status === 'OPEN');

  async function handleSubmit() {
    setError(null);
    if (!reason.trim()) {
      setError('Describe what went wrong.');
      return;
    }
    setSubmitting(true);
    try {
      await raiseDispute(bookingId, reason);
      setReason('');
      load();
    } catch (err) {
      setError(err.message || 'Could not submit this report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Report a problem</Text>
      <Text style={styles.subheading}>{packageName}</Text>

      {(disputes || []).map((d) => (
        <View key={d.id} style={styles.card}>
          <Text style={styles.status}>{STATUS_LABEL[d.status] || d.status}</Text>
          <Text style={styles.reason}>{d.reason}</Text>
          <Text style={styles.time}>Raised {formatDateTime(d.created_at)}</Text>
          {d.resolution_note ? (
            <View style={styles.resolutionBox}>
              <Text style={styles.resolutionLabel}>Resolution</Text>
              <Text style={styles.reason}>{d.resolution_note}</Text>
            </View>
          ) : null}
        </View>
      ))}

      {!hasOpenDispute ? (
        <View style={styles.card}>
          <TextField label="What went wrong?" value={reason} onChangeText={setReason} multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton title="Submit report" onPress={handleSubmit} loading={submitting} style={{ marginTop: 4 }} />
        </View>
      ) : (
        <Text style={styles.muted}>You already have an open report for this booking — GaadiGrid admin will follow up.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  back: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  status: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reason: {
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  resolutionBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resolutionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
