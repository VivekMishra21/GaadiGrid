import { StyleSheet, View } from 'react-native';
import { FadeIn } from './FadeIn';
import { staggerDelay } from '../theme/motion';

import { Text } from './AppText';
import { BOOKING_STATUS_LABELS } from '../constants/services';
import { colors } from '../theme/colors';
import { formatINR, formatMonthLabel, formatShortDate } from '../utils/format';
import { IconBadge } from './IconBadge';

const REMINDER_LABEL = { insurance: 'Insurance', puc: 'PUC', service: 'Service due' };
const REMINDER_ICON = { insurance: 'shieldCheck', puc: 'badgeCheck', service: 'wrench' };

export function ReminderRow({ reminder }) {
  const urgent = reminder.urgency !== 'OK';
  const days = reminder.days_remaining;
  return (
    <View style={styles.reminderRow}>
      <IconBadge name={REMINDER_ICON[reminder.type] || 'clock'} tone={urgent ? 'orange' : 'green'} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{REMINDER_LABEL[reminder.type] || reminder.type}</Text>
        <Text style={styles.rowSub}>Due {formatShortDate(reminder.due_date)}</Text>
      </View>
      <View style={[styles.duePill, urgent && styles.duePillUrgent]}>
        <Text style={[styles.reminderValue, urgent && styles.urgent]}>
          {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} left`}
        </Text>
      </View>
    </View>
  );
}

export function TimelineEventRow({ event, isLast }) {
  const isBooking = event.kind === 'BOOKING';
  const isRecord = event.kind === 'SERVICE_RECORD';
  const iconName = isBooking ? 'calendarCheck' : isRecord ? 'fileText' : 'wallet';
  const tone = isBooking ? 'green' : isRecord ? 'ink' : 'orange';
  const kindLabel = isBooking ? BOOKING_STATUS_LABELS[event.status] || event.status : isRecord ? 'Service record' : 'Expense';
  return (
    <View style={styles.eventRow}>
      <View style={styles.rail}>
        <IconBadge name={iconName} tone={tone} size={32} round />
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.eventBody}>
        <View style={styles.eventHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {event.title}
          </Text>
          {event.amount != null ? <Text style={styles.amount}>{formatINR(event.amount)}</Text> : null}
        </View>
        <Text style={styles.rowSub} numberOfLines={1}>
          {[kindLabel, event.subtitle, formatShortDate(event.occurred_at)]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </View>
  );
}

export function TimelineList({ events }) {
  return (
    <View>
      {events.map((event, i) => (
        <FadeIn key={`${event.kind}-${event.ref_id}`} delay={staggerDelay(i, 40, 60, 8)} distance={10}>
          <TimelineEventRow event={event} isLast={i === events.length - 1} />
        </FadeIn>
      ))}
    </View>
  );
}

// Bars are scaled to the busiest month shown; a month with nothing logged draws no bar.
export function MonthlyBars({ byMonth }) {
  const max = Math.max(...byMonth.map((m) => m.total), 0);
  return (
    <View style={styles.bars}>
      {byMonth.map((m) => (
        <View key={m.month} style={styles.barCol}>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: max > 0 ? `${Math.max((m.total / max) * 100, m.total > 0 ? 6 : 0)}%` : '0%' }]} />
          </View>
          <Text style={styles.barLabel}>{formatMonthLabel(m.month)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  duePill: { backgroundColor: colors.greenSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  duePillUrgent: { backgroundColor: colors.orangeSoft },
  rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  reminderValue: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  urgent: { color: '#C95F12' },
  eventRow: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { flex: 1, width: 2, backgroundColor: 'rgba(24,168,117,0.28)', marginVertical: 4 },
  eventBody: { flex: 1, paddingBottom: 16 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  amount: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 14 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', backgroundColor: colors.green, borderRadius: 6 },
  barLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
