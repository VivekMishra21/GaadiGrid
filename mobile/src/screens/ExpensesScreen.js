import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { LoadingMark } from '../components/LoadingMark';
import { createExpense, deleteExpense, getExpenseSummary, listExpenses } from '../api/expensesApi';
import { ChipGroup } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors } from '../theme/colors';

const CATEGORY_OPTIONS = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'PUC', label: 'PUC' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'FINE', label: 'Fine' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'OTHER', label: 'Other' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

const EMPTY_FORM = { category: 'FUEL', amount: '', expense_date: todayIso(), note: '' };

export function ExpensesScreen({ route }) {
  const { vehicle } = route.params;
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    listExpenses(vehicle.id)
      .then((res) => setExpenses(res.items))
      .catch(() => setExpenses([]));
    getExpenseSummary(vehicle.id)
      .then(setSummary)
      .catch(() => {});
  }, [vehicle.id]);

  useFocusEffect(load);

  async function handleRefresh() {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }

  async function handleAdd() {
    setError(null);
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await createExpense(vehicle.id, { ...form, amount });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      load();
    } catch (err) {
      setError(err.message || 'Could not save this expense.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(expense) {
    Alert.alert('Delete expense', `Delete this ₹${expense.amount.toFixed(0)} entry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteExpense(expense.id).then(load).catch(() => {}),
      },
    ]);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
      data={expenses || []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>Expenses</Text>
          <Text style={styles.subheading}>
            {vehicle.brand} {vehicle.model} · {vehicle.registration_number}
          </Text>

          {summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTotal}>₹{summary.total.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Total spent</Text>
            </View>
          ) : null}

          {showAddForm ? (
            <View style={styles.addForm}>
              <ChipGroup label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} />
              <TextField
                label="Amount (₹)"
                keyboardType="decimal-pad"
                value={form.amount}
                onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
              />
              <TextField
                label="Date"
                value={form.expense_date}
                onChangeText={(v) => setForm((p) => ({ ...p, expense_date: v }))}
                placeholder="YYYY-MM-DD"
              />
              <TextField label="Note (optional)" value={form.note} onChangeText={(v) => setForm((p) => ({ ...p, note: v }))} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button fullWidth onPress={handleAdd} loading={saving} style={{ marginTop: 4 }}>Save expense</Button>
              <TouchableOpacity onPress={() => setShowAddForm(false)} style={{ marginTop: 10 }}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button fullWidth onPress={() => setShowAddForm(true)} variant="secondary" style={styles.addButton}>+ Add expense</Button>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowCategory}>{item.category}</Text>
            {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
            <Text style={styles.rowDate}>{formatDate(item.expense_date)}</Text>
          </View>
          <Text style={styles.rowAmount}>₹{item.amount.toFixed(0)}</Text>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.remove}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        expenses === null ? (
          <LoadingMark />
        ) : (
          <EmptyState title="No expenses logged yet" subtitle="Track fuel, service, insurance and other costs for this vehicle." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    shadowColor: '#11181A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    padding: 16,
    marginBottom: 16,
  },
  summaryTotal: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    marginBottom: 20,
  },
  addForm: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    shadowColor: '#11181A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    padding: 16,
    marginBottom: 20,
  },
  cancelLink: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    shadowColor: '#11181A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    padding: 14,
    marginBottom: 10,
  },
  rowCategory: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  rowNote: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rowDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  rowAmount: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 14,
  },
  remove: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
