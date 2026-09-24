import { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { requestDeleteAccount } from '../api/authApi';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';

export function ProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { vehicles, fetchVehicles, removeVehicle } = useVehicleStore();

  useEffect(() => {
    fetchVehicles().catch(() => {});
  }, [fetchVehicles]);

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out of GaadiGrid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  function handleDeleteVehicle(vehicle) {
    Alert.alert('Remove vehicle', `Remove ${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeVehicle(vehicle.id).catch(() => {}) },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      "This submits a request to permanently delete your GaadiGrid account. We'll process it and you'll be signed out.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: async () => {
            await requestDeleteAccount('User requested from mobile app').catch(() => {});
            logout();
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.heading}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.full_name}</Text>
        {user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
      </View>

      <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('Notifications')}>
        <Text style={styles.linkCardText}>Notifications</Text>
        <Text style={styles.link}>View</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your vehicles</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VehicleForm', { mode: 'add' })}>
          <Text style={styles.link}>Add vehicle</Text>
        </TouchableOpacity>
      </View>

      {vehicles.length === 0 ? (
        <Text style={styles.muted}>No vehicles added yet.</Text>
      ) : (
        vehicles.map((vehicle) => (
          <View key={vehicle.id} style={styles.vehicleCard}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('VehicleForm', { mode: 'edit', vehicle })}
            >
              <Text style={styles.vehicleName}>
                {vehicle.brand} {vehicle.model}
                {vehicle.is_default ? ' · Default' : ''}
              </Text>
              <Text style={styles.meta}>{vehicle.registration_number}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Expenses', { vehicle })} style={{ marginRight: 14 }}>
              <Text style={styles.link}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteVehicle(vehicle)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={styles.actions}>
        <PrimaryButton title="Sign out" onPress={handleLogout} variant="secondary" style={styles.actionBtn} />
        <TouchableOpacity onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccount}>Delete my account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  linkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  linkCardText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  link: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 20,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  vehicleName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  remove: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginTop: 20,
    alignItems: 'center',
  },
  actionBtn: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  deleteAccount: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
