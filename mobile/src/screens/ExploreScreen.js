import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Text } from '../components/AppText';
import { LoadingMark } from '../components/LoadingMark';
import { ChipGroup } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { StationCard } from '../components/StationCard';
import { TextField } from '../components/TextField';
import { useStationStore } from '../store/stationStore';
import { selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { colors } from '../theme/colors';
import { fuelLabel, stationFuelForVehicle, vehicleTitle } from '../utils/format';

const FUEL_FILTER_OPTIONS = [{ value: null, label: 'All' }];

export function ExploreScreen({ navigation }) {
  const { stations, status, filters, fuelTypes, setFilters, search, fetchFuelTypes } = useStationStore();
  const [queryInput, setQueryInput] = useState(filters.q || '');
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | granted | denied
  const vehicle = useVehicleStore(selectCurrentVehicle);
  const vehicleFuel = stationFuelForVehicle(vehicle);

  useEffect(() => {
    fetchFuelTypes().catch(() => {});
  }, [fetchFuelTypes]);

  useEffect(() => {
    let cancelled = false;

    async function locateAndSearch() {
      try {
        const { status: permission } = await Location.getForegroundPermissionsAsync();
        if (permission === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled) return;
          setLocationStatus('granted');
          setFilters({ lat: position.coords.latitude, lng: position.coords.longitude });
        } else {
          setLocationStatus('denied');
        }
      } catch {
        setLocationStatus('denied');
      } finally {
        if (!cancelled) {
          // Start from the fuel this vehicle actually uses; the user can still widen to "All".
          if (!useStationStore.getState().filters.fuel_type && vehicleFuel) setFilters({ fuel_type: vehicleFuel });
          search().catch(() => {});
        }
      }
    }

    locateAndSearch();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(
    (overrides) => {
      if (overrides) setFilters(overrides);
      search().catch(() => {});
    },
    [setFilters, search]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await search().catch(() => {});
    setRefreshing(false);
  }

  const fuelOptions = [...FUEL_FILTER_OPTIONS, ...fuelTypes.map((ft) => ({ value: ft.code, label: ft.label }))];

  const vehicleHint =
    vehicle && vehicleFuel && filters.fuel_type === vehicleFuel
      ? `Showing ${fuelLabel(vehicleFuel)} stations for ${vehicleTitle(vehicle)}`
      : 'Live prices and queue reports near you';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Find fuel stations" subtitle={vehicleHint} />

      <View style={styles.searchRow}>
        <TextField
          placeholder="Search by name, locality or city"
          icon="search"
          value={queryInput}
          onChangeText={setQueryInput}
          onSubmitEditing={() => runSearch({ q: queryInput })}
          returnKeyType="search"
          style={styles.searchField}
        />
      </View>

      <ChipGroup scroll options={fuelOptions} value={filters.fuel_type} onChange={(value) => runSearch({ fuel_type: value })} />

      {locationStatus === 'denied' && (
        <View style={styles.locationHint}>
          <Icon name="locate" size={16} color={colors.orange} />
          <Text style={styles.locationHintText}>
            Location access is off, so results aren&apos;t sorted by distance. Search by city or area name instead.
          </Text>
        </View>
      )}

      <FlatList
        data={stations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => (
          <StationCard station={item} onPress={() => navigation.navigate('StationDetail', { stationId: item.id })} />
        )}
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingMark />
          ) : status === 'error' ? (
            <EmptyState icon="alert" tone="orange" title="Couldn't load stations" subtitle="Check your connection and try again." actionLabel="Retry" onAction={() => runSearch()} />
          ) : (
            <EmptyState icon="fuel" title="No stations found" subtitle="Try a different search, filter, or city." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  searchRow: { paddingHorizontal: 20 },
  searchField: { marginBottom: 12 },
  locationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
  },
  locationHintText: { flex: 1, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  muted: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
});
