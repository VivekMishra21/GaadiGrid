import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../components/AppText';
import { LoadingMark } from '../components/LoadingMark';
import { ChipGroup } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ProviderCard } from '../components/ProviderCard';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { TextField } from '../components/TextField';
import { GROUP_COPY, VEHICLE_CARE_INSPECTION } from '../constants/content';
import { categoryLabel, SERVICE_GROUPS } from '../constants/services';
import { searchProviders } from '../api/providersApi';
import { colors } from '../theme/colors';

const vehicleCareHero = require('../../assets/images/vehicle-care-hero.jpg');
const vehicleCareInspection = require('../../assets/images/vehicle-care-inspection.jpg');

async function searchGroup(group, { q, category }) {
  const categories = category ? [category] : SERVICE_GROUPS[group].categories;
  const results = await Promise.all(
    categories.map((cat) => searchProviders({ category: cat, ...(q ? { q } : {}) }).then((res) => res.items))
  );
  const byId = new Map();
  results.flat().forEach((p) => byId.set(p.id, p));
  // Sponsored partners first, matching the website's ordering; sort() is stable otherwise.
  return [...byId.values()].sort((a, b) => Number(!!b.is_sponsored) - Number(!!a.is_sponsored));
}

function VehicleCareInspection() {
  const copy = VEHICLE_CARE_INSPECTION;
  return (
    <View style={styles.inspection}>
      <ResponsiveImage source={vehicleCareInspection} ratio={1} inset={20} style={styles.inspectionImage} accessibilityLabel="A GaadiGrid technician closely inspecting a car's fender and tyre with a gloss meter" />
      <Text style={styles.eyebrowOrange}>{copy.eyebrow}</Text>
      <Text style={styles.inspectionHeading}>{copy.heading}</Text>
      <Text style={styles.inspectionBody}>{copy.body}</Text>
      <View style={styles.tagRow}>
        {SERVICE_GROUPS.VEHICLE_CARE.categories
          .filter((c) => c !== 'OTHER')
          .map((c) => (
            <View key={c} style={styles.tag}>
              <Text style={styles.tagText}>{categoryLabel(c)}</Text>
            </View>
          ))}
      </View>
      {copy.trustTags.map((tag) => (
        <Text key={tag} style={styles.trust}>
          ✓  {tag}
        </Text>
      ))}
      <Text style={styles.footnote}>{copy.footnote}</Text>
    </View>
  );
}

export function ServicesScreen({ navigation, route }) {
  const [group, setGroup] = useState(route.params?.group || 'CAR_WASH');
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState('idle');
  const [queryInput, setQueryInput] = useState('');
  const [category, setCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const search = useCallback(
    (overrides) => {
      setStatus('loading');
      const g = overrides?.group ?? group;
      const q = overrides?.q ?? queryInput;
      const cat = overrides?.category !== undefined ? overrides.category : category;
      searchGroup(g, { q: q.trim(), category: cat })
        .then((items) => {
          setProviders(items);
          setStatus('loaded');
        })
        .catch(() => setStatus('error'));
    },
    [group, queryInput, category]
  );

  function selectGroup(next) {
    if (next === group) return;
    setGroup(next);
    setCategory(null);
    search({ group: next, category: null });
  }

  const requestedGroup = route.params?.group;
  useEffect(() => {
    if (requestedGroup && requestedGroup !== group) {
      setGroup(requestedGroup);
      setCategory(null);
      search({ group: requestedGroup, category: null });
    }
    // Only react to a new group being requested from elsewhere (e.g. a Home tile).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedGroup]);

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    search();
    setRefreshing(false);
  }

  const copy = GROUP_COPY[group];
  const chipOptions = [{ value: null, label: 'All' }, ...SERVICE_GROUPS[group].categories.map((c) => ({ value: c, label: categoryLabel(c) }))];

  const header = (
    <View>
      <View style={styles.segment}>
        {Object.entries(SERVICE_GROUPS).map(([key, def]) => (
          <TouchableOpacity
            key={key}
            onPress={() => selectGroup(key)}
            style={[styles.segmentBtn, group === key && styles.segmentBtnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: group === key }}
          >
            <Text style={[styles.segmentText, group === key && styles.segmentTextActive]}>{def.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {group === 'VEHICLE_CARE' ? (
        <View style={styles.hero}>
          <ResponsiveImage
            source={vehicleCareHero}
            ratio={1400 / 788}
            inset={20}
            style={styles.heroImage}
            accessibilityLabel="A GaadiGrid technician inspecting an engine bay with a diagnostic tablet"
          />
          <Text style={styles.eyebrowGreen}>{copy.hero.eyebrow}</Text>
          <Text style={styles.heroHeading}>{copy.hero.heading}</Text>
          <Text style={styles.description}>{copy.hero.description}</Text>
        </View>
      ) : (
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.description}>{copy.description}</Text>
        </View>
      )}
      <View style={styles.launching}>
        <Icon name="mapPin" size={13} color={colors.textMuted} />
        <Text style={styles.launchingText}>Launching in Noida first — more cities coming soon</Text>
      </View>

      <View style={styles.searchRow}>
        <TextField
          placeholder="Search by business name or area"
          icon="search"
          value={queryInput}
          onChangeText={setQueryInput}
          onSubmitEditing={() => search({ q: queryInput })}
          returnKeyType="search"
          style={styles.searchField}
        />
      </View>

      <View style={styles.chips}>
        <ChipGroup
          scroll
          options={chipOptions}
          value={category}
          onChange={(value) => {
            setCategory(value);
            search({ category: value });
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={providers}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        ListFooterComponent={group === 'VEHICLE_CARE' ? <VehicleCareInspection /> : null}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textSecondary} />}
        renderItem={({ item }) => (
          <ProviderCard provider={item} onPress={() => navigation.navigate('ProviderDetail', { providerId: item.id })} />
        )}
        ListEmptyComponent={
          status === 'loading' ? (
            <LoadingMark />
          ) : status === 'error' ? (
            <EmptyState icon="alert" tone="orange" title="Couldn't load services" subtitle="Check your connection and try again." actionLabel="Retry" onAction={() => search()} />
          ) : (
            <EmptyState icon="store" title={copy.emptyTitle} subtitle={copy.emptySubtitle} />
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
  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
  },
  segmentBtn: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: colors.ink },
  segmentText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF' },
  titleBlock: {
    paddingHorizontal: 20,
  },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  hero: {
    paddingHorizontal: 20,
  },
  heroImage: { borderRadius: 20, marginBottom: 16 },
  eyebrowGreen: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrowOrange: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
  },
  heroHeading: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  launching: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginTop: 10, marginBottom: 16 },
  launchingText: { color: colors.textMuted, fontSize: 12 },
  searchRow: { paddingHorizontal: 20 },
  searchField: { marginBottom: 0 },
  chips: { paddingTop: 12, paddingBottom: 4 },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
  inspection: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  inspectionImage: {
    borderRadius: 16,
  },
  inspectionHeading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 26,
  },
  inspectionBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  trust: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 16,
  },
});
