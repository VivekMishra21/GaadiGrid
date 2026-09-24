import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { createPaymentOrder, devCompletePayment, getPaymentOrder } from '../api/paymentsApi';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

export function PaymentScreen({ route, navigation }) {
  const { bookingId, packageName, amount } = route.params;

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPaymentOrder(bookingId)
      .then((existing) => {
        if (existing && existing.status === 'CREATED') {
          setOrder(existing);
          setStatus('ready');
          return;
        }
        return createPaymentOrder(bookingId).then((created) => {
          setOrder(created);
          setStatus('ready');
        });
      })
      .catch((err) => {
        setError(err.message || 'Could not start payment.');
        setStatus('error');
      });
  }, [bookingId]);

  async function handlePay(success) {
    setPaying(true);
    setError(null);
    try {
      const updated = await devCompletePayment(order.id, success);
      if (updated.status === 'PAID') {
        navigation.replace('PaymentResult', { success: true });
      } else {
        navigation.replace('PaymentResult', { success: false });
      }
    } catch (err) {
      setError(err.message || 'Payment could not be completed.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Paying for</Text>
        <Text style={styles.packageName}>{packageName}</Text>
        <Text style={styles.amount}>₹{Number(amount).toFixed(2)}</Text>
      </View>

      <View style={styles.devBanner}>
        <Text style={styles.devBannerText}>
          DEV MODE — this simulates a payment. No real gateway is connected and no money moves. A real Razorpay
          checkout will replace this once live credentials are configured.
        </Text>
      </View>

      {status === 'loading' ? <Text style={styles.muted}>Preparing payment...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {status === 'ready' ? (
        <>
          <PrimaryButton title={`Pay ₹${Number(amount).toFixed(2)} (simulated)`} onPress={() => handlePay(true)} loading={paying} style={styles.payButton} />
          <PrimaryButton title="Simulate a failed payment" onPress={() => handlePay(false)} variant="secondary" disabled={paying} style={styles.failButton} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
    paddingTop: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  packageName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 6,
  },
  amount: {
    color: colors.green,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 10,
  },
  devBanner: {
    backgroundColor: 'rgba(255, 138, 52, 0.12)',
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  devBannerText: {
    color: colors.orange,
    fontSize: 12,
    lineHeight: 18,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  payButton: {
    marginTop: 28,
  },
  failButton: {
    marginTop: 12,
  },
});
