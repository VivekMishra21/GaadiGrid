import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from './AppText';
import { colors } from '../theme/colors';

export function ChipGroup({ label, options, value, onChange, error, testID, scroll = false }) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <TouchableOpacity
        key={option.value}
        onPress={() => onChange(option.value)}
        activeOpacity={0.8}
        style={[styles.chip, selected && styles.chipSelected]}
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{ selected, checked: selected }}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container} testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {scroll ? (
        // One tidy row that scrolls sideways instead of wrapping onto several lines.
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, styles.scrollRow]} keyboardShouldPersistTaps="handled">
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.row}>{chips}</View>
      )}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scrollRow: { flexWrap: 'nowrap', paddingHorizontal: 20 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },
  error: { color: colors.error, fontSize: 12, fontWeight: '600', marginTop: 4 },
});
