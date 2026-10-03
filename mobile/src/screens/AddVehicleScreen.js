import { StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { VehicleForm } from '../components/VehicleForm';
import { useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';

export function AddVehicleScreen({ onDone }) {
  const addVehicle = useVehicleStore((s) => s.addVehicle);

  async function handleSubmit(payload) {
    await addVehicle(payload);
    onDone();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let&apos;s start with your car.</Text>
      <Text style={styles.body}>Adding your vehicle lets GaadiGrid connect fuel, services, bookings, expenses and reminders to it. You can add more vehicles later from My Garage.</Text>

      <VehicleForm onSubmit={handleSubmit} submitLabel="Save and continue" showDefaultToggle={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 24,
  },
});
