import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

export function BookingConfirmedScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={styles.title}>Booking requested</Text>
      <Text style={styles.subtitle}>
        The provider will confirm your booking shortly. You can track its status from the Bookings tab.
      </Text>
      <PrimaryButton title="View my bookings" onPress={() => navigation.navigate('Bookings')} style={styles.button} />
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
  checkmark: {
    fontSize: 48,
    color: colors.green,
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
