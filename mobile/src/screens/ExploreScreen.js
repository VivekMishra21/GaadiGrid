import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { StationCard } from '../components/StationCard';
import { TextField } from '../components/TextField';
import { useStationStore } from '../store/stationStore';
import { colors } from '../theme/colors';

const FUEL_FILTER_OPTIONS = [{ value: null, label: 'All' }];

export function ExploreScreen({ navigation }) {
  const { stations, status, filters, fuelTypes, setFilters, search, fetchFuelTypes } = useStationStore();
  const [queryInput, setQueryInput] = useState(filters.q || '');
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | granted | denied

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
        if (!cancelled) search().catch(() => {});
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find fuel stations</Text>

      <View style={styles.searchRow}>
        <TextField
          placeholder="Search by name, locality or city"
          value={queryInput}
          onChangeText={setQueryInput}
          onSubmitEditing={() => runSearch({ q: queryInput })}
          returnKeyType="search"
          style={styles.searchField}
        />
      </View>

      <ChipGroup
        options={fuelOptions}
        value={filters.fuel_type}
        onChange={(value) => runSearch({ fuel_type: value })}
      />

      {locationStatus === 'denied' && (
        <Text style={styles.locationHint}>
          Location access is off, so results aren&apos;t sorted by distance. Search by city or area name instead.
        </Text>
      )}

      <FlatList
        data={stations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => (
          <StationCard station={item} onPress={() => navigation.navigate('StationDetail', { stationId: item.id })} />
        )}
        ListEmptyComponent={
          status === 'loading' ? (
            <Text style={styles.muted}>Searching...</Text>
          ) : status === 'error' ? (
            <EmptyState title="Couldn't load stations" subtitle="Check your connection and try again." actionLabel="Retry" onAction={() => runSearch()} />
          ) : (
            <EmptyState title="No stations found" subtitle="Try a different search, filter, or city." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchRow: {
    paddingHorizontal: 16,
  },
  searchField: {
    marginBottom: 0,
  },
  locationHint: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
