import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getReview, submitReview } from '../api/bookingsApi';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { colors } from '../theme/colors';

function StarRow({ rating, onChange }) {
  if (!onChange) {
    return (
      <View style={styles.starRow} accessibilityLabel={`Rated ${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Text key={n} style={[styles.star, n <= rating && styles.starFilled]}>
            ★
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${n} star${n === 1 ? '' : 's'}`}
          accessibilityState={{ selected: n === rating }}
        >
          <Text style={[styles.star, n <= rating && styles.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ReviewScreen({ route, navigation }) {
  const { bookingId, packageName } = route.params;
  const [existing, setExisting] = useState(undefined);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getReview(bookingId)
      .then(setExisting)
      .catch(() => setExisting(null));
  }, [bookingId]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const review = await submitReview(bookingId, rating, comment);
      setExisting(review);
    } catch (err) {
      setError(err.message || 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  }

  if (existing === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>{existing ? 'Your review' : 'Rate this service'}</Text>
      <Text style={styles.subheading}>{packageName}</Text>

      {existing ? (
        <View style={styles.card}>
          <StarRow rating={existing.rating} />
          {existing.comment ? <Text style={styles.comment}>{existing.comment}</Text> : null}
          {existing.provider_response ? (
            <View style={styles.responseBox}>
              <Text style={styles.responseLabel}>Provider response</Text>
              <Text style={styles.comment}>{existing.provider_response}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <StarRow rating={rating} onChange={setRating} />
          <TextField
            label="Comment (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            style={{ marginTop: 16 }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton title="Submit review" onPress={handleSubmit} loading={submitting} style={{ marginTop: 8 }} />
        </View>
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
  },
  starRow: {
    flexDirection: 'row',
    gap: 6,
  },
  star: {
    fontSize: 30,
    color: colors.border,
  },
  starFilled: {
    color: colors.orange,
  },
  comment: {
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: 14,
    lineHeight: 20,
  },
  responseBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  responseLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 12,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
