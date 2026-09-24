import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { VehicleForm } from '../components/VehicleForm';
import { useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';

export function VehicleFormScreen({ route, navigation }) {
  const { mode, vehicle } = route.params;
  const addVehicle = useVehicleStore((s) => s.addVehicle);
  const editVehicle = useVehicleStore((s) => s.editVehicle);

  async function handleSubmit(payload) {
    if (mode === 'edit') {
      await editVehicle(vehicle.id, payload);
    } else {
      await addVehicle(payload);
    }
    navigation.goBack();
  }

  const initialValues =
    mode === 'edit'
      ? {
          vehicleType: vehicle.vehicle_type,
          registrationNumber: vehicle.registration_number,
          brand: vehicle.brand,
          model: vehicle.model,
          variant: vehicle.variant || '',
          fuelType: vehicle.fuel_type,
          averageMileage: vehicle.average_mileage != null ? String(vehicle.average_mileage) : '',
          isDefault: vehicle.is_default,
        }
      : undefined;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>{'‹ Back'}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{mode === 'edit' ? 'Edit vehicle' : 'Add vehicle'}</Text>

      <VehicleForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitLabel={mode === 'edit' ? 'Save changes' : 'Add vehicle'}
      />
    </View>
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
    fontSize: 14,
    marginBottom: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
});
