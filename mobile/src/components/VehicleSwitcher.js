import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from './AppText';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { vehicleTitle } from '../utils/format';

// Pill row for switching which vehicle the app is currently about. Renders nothing when
// there is only one vehicle and no add handler — nothing to switch between.
export function VehicleSwitcher({ onAdd }) {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const current = useVehicleStore(selectCurrentVehicle);
  const selectVehicle = useVehicleStore((s) => s.selectVehicle);

  if (vehicles.length < 2 && !onAdd) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {vehicles.map((vehicle) => {
        const selected = current?.id === vehicle.id;
        return (
          <TouchableOpacity
            key={vehicle.id}
            onPress={() => selectVehicle(vehicle.id)}
            style={[styles.pill, selected && styles.pillSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${vehicleTitle(vehicle)}, ${vehicle.registration_number}`}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.pillText, selected && styles.pillTextSelected]} numberOfLines={1}>
              {vehicleTitle(vehicle)}
            </Text>
          </TouchableOpacity>
        );
      })}
      {onAdd ? (
        <TouchableOpacity onPress={onAdd} style={styles.addPill} accessibilityRole="button" accessibilityLabel="Add a vehicle">
          <Text style={styles.addText}>+ Add vehicle</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  pill: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 220,
  },
  pillSelected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  pillText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  addPill: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.green,
  },
  addText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '700',
  },
});
