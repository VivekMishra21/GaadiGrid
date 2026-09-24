import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ChipGroup } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { ProviderCard } from '../components/ProviderCard';
import { TextField } from '../components/TextField';
import { SERVICE_CATEGORIES } from '../constants/services';
import { searchProviders } from '../api/providersApi';
import { colors } from '../theme/colors';

export function ServicesScreen({ navigation }) {
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState('idle');
  const [queryInput, setQueryInput] = useState('');
  const [category, setCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const search = useCallback((overrides) => {
    setStatus('loading');
    const params = {};
    const q = overrides?.q ?? queryInput;
    const cat = overrides?.category !== undefined ? overrides.category : category;
    if (q) params.q = q;
    if (cat) params.category = cat;

    searchProviders(params)
      .then((res) => {
        setProviders(res.items);
        setStatus('loaded');
      })
      .catch(() => setStatus('error'));
  }, [queryInput, category]);

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    search();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Car care services</Text>

      <View style={styles.searchRow}>
        <TextField
          placeholder="Search by business name or area"
          value={queryInput}
          onChangeText={setQueryInput}
          onSubmitEditing={() => search({ q: queryInput })}
          returnKeyType="search"
          style={styles.searchField}
        />
      </View>

      <ChipGroup
        options={SERVICE_CATEGORIES}
        value={category}
        onChange={(value) => {
          setCategory(value);
          search({ category: value });
        }}
      />

      <FlatList
        data={providers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => (
          <ProviderCard provider={item} onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })} />
        )}
        ListEmptyComponent={
          status === 'loading' ? (
            <Text style={styles.muted}>Searching...</Text>
          ) : status === 'error' ? (
            <EmptyState title="Couldn't load services" subtitle="Check your connection and try again." actionLabel="Retry" onAction={() => search()} />
          ) : (
            <EmptyState title="No providers found" subtitle="Try a different search or category." />
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
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
