import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

export function PaymentResultScreen({ route, navigation }) {
  const { success } = route.params;

  return (
    <View style={styles.container}>
      <Text style={[styles.icon, { color: success ? colors.green : colors.error }]}>{success ? '✓' : '✕'}</Text>
      <Text style={styles.title}>{success ? 'Payment successful' : 'Payment failed'}</Text>
      <Text style={styles.subtitle}>
        {success
          ? 'Your booking is paid. The provider can now start the service at the scheduled time.'
          : 'The payment could not be completed. You can try again from your bookings.'}
      </Text>
      <PrimaryButton title="Back to my bookings" onPress={() => navigation.navigate('BookingsList')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    alignSelf: 'stretch',
  },
});
