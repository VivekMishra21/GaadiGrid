import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Text } from './AppText';
import { FUEL_TYPES, VEHICLE_TYPES, validateVehicleForm } from '../constants/vehicle';
import { colors } from '../theme/colors';
import { ChipGroup } from './Chip';
import { Button } from './Button';
import { TextField } from './TextField';

const EMPTY_FORM = {
  vehicleType: 'CAR',
  registrationNumber: '',
  brand: '',
  model: '',
  variant: '',
  fuelType: 'PETROL',
  averageMileage: '',
  isDefault: false,
};

export function VehicleForm({ initialValues, submitLabel = 'Save vehicle', onSubmit, submitting, showDefaultToggle = true }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialValues });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitError(null);
    const validationErrors = validateVehicleForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({
        vehicle_type: form.vehicleType,
        registration_number: form.registrationNumber.toUpperCase().replace(/\s|-/g, ''),
        brand: form.brand.trim(),
        model: form.model.trim(),
        variant: form.variant.trim() || null,
        fuel_type: form.fuelType,
        average_mileage: form.averageMileage ? Number(form.averageMileage) : null,
        is_default: form.isDefault,
      });
    } catch (err) {
      setSubmitError(err.message || 'Could not save vehicle. Please try again.');
    }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" testID="vehicle-form">
      <ChipGroup
        label="Vehicle type"
        options={VEHICLE_TYPES}
        value={form.vehicleType}
        onChange={(v) => setField('vehicleType', v)}
        error={errors.vehicleType}
        testID="vehicle-type-chips"
      />

      <TextField
        label="Registration number"
        placeholder="DL01AB1234"
        autoCapitalize="characters"
        value={form.registrationNumber}
        onChangeText={(v) => setField('registrationNumber', v)}
        error={errors.registrationNumber}
      />

      <TextField
        label="Brand"
        placeholder="Maruti Suzuki"
        value={form.brand}
        onChangeText={(v) => setField('brand', v)}
        error={errors.brand}
      />

      <TextField
        label="Model"
        placeholder="Swift"
        value={form.model}
        onChangeText={(v) => setField('model', v)}
        error={errors.model}
      />

      <TextField
        label="Variant (optional)"
        placeholder="VXI"
        value={form.variant}
        onChangeText={(v) => setField('variant', v)}
      />

      <ChipGroup
        label="Fuel type"
        options={FUEL_TYPES}
        value={form.fuelType}
        onChange={(v) => setField('fuelType', v)}
        error={errors.fuelType}
        testID="fuel-type-chips"
      />

      <TextField
        label="Average mileage (optional)"
        placeholder="e.g. 18.5"
        keyboardType="decimal-pad"
        value={String(form.averageMileage)}
        onChangeText={(v) => setField('averageMileage', v)}
        error={errors.averageMileage}
      />

      {showDefaultToggle ? (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Set as default vehicle</Text>
          <Switch
            value={form.isDefault}
            onValueChange={(v) => setField('isDefault', v)}
            trackColor={{ false: colors.border, true: colors.green }}
          />
        </View>
      ) : null}

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

      <Button fullWidth onPress={handleSubmit} loading={submitting} style={styles.submit}>{submitLabel}</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 4,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitError: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 12,
  },
  submit: {
    marginBottom: 24,
  },
});
