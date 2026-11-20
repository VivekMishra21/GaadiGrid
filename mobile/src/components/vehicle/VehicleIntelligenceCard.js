import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '../AppText';
import { Icon } from '../Icon';
import { deriveVehicleIntelligence } from '../../features/garage/intelligence';
import { colors } from '../../theme/colors';
import { radius, shadow } from '../../theme/tokens';

const TONE_COLOR = { ok: colors.textPrimary, attention: '#C95F12', muted: colors.textMuted };

/**
 * One card where a vehicle's reminders, history, spend and odometer meet. Lines that have an action
 * are tappable and take the user to where the data lives (or where to add it).
 */
export function VehicleIntelligenceCard({ data, onAction }) {
  const lines = deriveVehicleIntelligence(data);
  if (lines.length === 0) return null;

  return (
    <View style={styles.card} testID="vehicle-intelligence">
      <Text style={styles.title}>Vehicle intelligence</Text>
      {lines.map((line, i) => {
        const Row = line.action ? TouchableOpacity : View;
        const rowProps = line.action
          ? { onPress: () => onAction?.(line.action), accessibilityRole: 'button', accessibilityLabel: `${line.label}: ${line.value}`, activeOpacity: 0.7 }
          : {};
        return (
          <Row key={line.key} style={[styles.row, i === lines.length - 1 && styles.rowLast]} testID={`intel-${line.key}`} {...rowProps}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{line.label}</Text>
              <Text style={[styles.value, { color: TONE_COLOR[line.tone] }]} numberOfLines={1}>
                {line.value}
              </Text>
              {line.hint ? <Text style={styles.hint}>{line.hint}</Text> : null}
            </View>
            {line.action ? <Icon name="chevronRight" size={18} color={colors.textMuted} /> : null}
          </Row>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingTop: 14, ...shadow.card },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  value: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
