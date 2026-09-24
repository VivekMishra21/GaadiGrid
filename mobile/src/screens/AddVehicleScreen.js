import { StyleSheet, Text, View } from 'react-native';

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
      <Text style={styles.title}>Add your vehicle</Text>
      <Text style={styles.body}>This helps us show accurate mileage-based savings and service reminders.</Text>

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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 24,
  },
});
