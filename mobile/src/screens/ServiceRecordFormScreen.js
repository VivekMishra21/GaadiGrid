import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { createServiceRecord, deleteServiceRecord, updateServiceRecord } from '../api/vehiclesApi';
import { ChipGroup } from '../components/Chip';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { SERVICE_CATEGORIES } from '../constants/services';
import { colors } from '../theme/colors';
import { vehicleTitle } from '../utils/format';
import { isValidIsoDate, isFutureIsoDate, todayIso } from '../utils/validators';
import { BackButton } from '../components/BackButton';

const TYPE_OPTIONS = SERVICE_CATEGORIES.filter((c) => c.value !== null);
// Fields a record created from a completed booking still lets the owner edit.
const BOOKING_LOCKED_NOTE = 'This record came from a completed booking, so only the odometer, invoice number, work done and notes can change.';

function toPositiveInt(text) {
  const n = Number(String(text).replace(/,/g, '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toPositiveNumber(text) {
  const n = Number(String(text).replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ServiceRecordFormScreen({ route, navigation }) {
  const { vehicle, record } = route.params;
  const editing = !!record;
  const fromBooking = editing && record.source === 'BOOKING';

  const [serviceType, setServiceType] = useState(record?.service_type || 'GENERAL_SERVICE');
  const [title, setTitle] = useState(record?.title || '');
  const [providerName, setProviderName] = useState(record?.provider_name || '');
  const [serviceDate, setServiceDate] = useState(record?.service_date || todayIso());
  const [odometer, setOdometer] = useState(record?.odometer_km ? String(record.odometer_km) : '');
  const [amount, setAmount] = useState(record?.amount ? String(record.amount) : '');
  const [invoice, setInvoice] = useState(record?.invoice_number || '');
  const [workDone, setWorkDone] = useState(record?.work_done || '');
  const [notes, setNotes] = useState(record?.notes || '');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const next = {};
    if (!fromBooking) {
      if (!title.trim()) next.title = 'Enter what was done, e.g. "Full service"';
      if (!isValidIsoDate(serviceDate)) next.serviceDate = 'Use the format YYYY-MM-DD';
      else if (isFutureIsoDate(serviceDate)) next.serviceDate = "The date can't be in the future";
      if (amount.trim() && !toPositiveNumber(amount)) next.amount = 'Enter a valid amount';
    }
    if (odometer.trim() && !toPositiveInt(odometer)) next.odometer = 'Enter the reading in whole kilometres';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      odometer_km: odometer.trim() ? toPositiveInt(odometer) : null,
      invoice_number: invoice.trim() || null,
      work_done: workDone.trim() || null,
      notes: notes.trim() || null,
    };
    if (!fromBooking) {
      Object.assign(payload, {
        service_type: serviceType,
        title: title.trim(),
        provider_name: providerName.trim() || null,
        service_date: serviceDate,
        amount: amount.trim() ? toPositiveNumber(amount) : null,
      });
    }

    setApiError(null);
    setSaving(true);
    try {
      if (editing) await updateServiceRecord(record.id, payload);
      else await createServiceRecord(vehicle.id, payload);
      navigation.goBack();
    } catch (err) {
      setApiError(err.message || 'Could not save this record. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete record', 'This also removes the expense logged with it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteServiceRecord(record.id);
            navigation.goBack();
          } catch (err) {
            setApiError(err.message || 'Could not delete this record.');
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.heading}>{editing ? 'Service record' : 'Add a service record'}</Text>
        <Text style={styles.sub}>{vehicleTitle(vehicle)} · {vehicle.registration_number}</Text>
        {fromBooking ? <Text style={styles.lockNote}>{BOOKING_LOCKED_NOTE}</Text> : null}

        {!fromBooking ? (
          <>
            <ChipGroup label="Type of service" options={TYPE_OPTIONS} value={serviceType} onChange={setServiceType} />
            <TextField label="What was done" value={title} onChangeText={setTitle} maxLength={255} error={errors.title} placeholder="Full service, tyre change…" />
            <TextField label="Garage or provider (optional)" value={providerName} onChangeText={setProviderName} maxLength={255} />
            <TextField label="Date" value={serviceDate} onChangeText={setServiceDate} maxLength={10} error={errors.serviceDate} placeholder="YYYY-MM-DD" />
            <TextField label="Amount paid, ₹ (optional)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={errors.amount} />
          </>
        ) : null}

        <TextField label="Odometer, km (optional)" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" error={errors.odometer} />
        <TextField label="Invoice number (optional)" value={invoice} onChangeText={setInvoice} maxLength={100} />
        <TextField
          label="Work done / parts (optional)"
          value={workDone}
          onChangeText={setWorkDone}
          maxLength={1000}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.multiline}
        />
        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={1000} multiline numberOfLines={2} textAlignVertical="top" style={styles.multiline} />

        <Text style={styles.hint}>Invoice photos and documents aren&apos;t supported yet — file storage isn&apos;t set up.</Text>
        {apiError ? <Text style={styles.error}>{apiError}</Text> : null}
        <Button fullWidth onPress={handleSave} loading={saving}>{editing ? 'Save changes' : 'Save record'}</Button>
        {editing && !fromBooking ? (
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <TouchableOpacity onPress={handleDelete} accessibilityRole="button">
              <Text style={styles.delete}>Delete this record</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  back: { color: colors.green, fontSize: 14, fontWeight: '600', marginBottom: 14 },
  heading: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 18 },
  lockNote: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, backgroundColor: colors.surfaceRaised, borderRadius: 10, padding: 12, marginBottom: 16 },
  multiline: { minHeight: 80 },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 14 },
  error: { color: colors.error, fontSize: 13, marginBottom: 10 },
  delete: { color: colors.error, fontSize: 13, fontWeight: '700' },
});
