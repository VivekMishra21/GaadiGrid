import { formatINR, formatINR2, formatShortDate } from '../../utils/format';

const REMINDER_LABEL = { insurance: 'Insurance', puc: 'PUC', service: 'Service' };

const dueText = (days) => (days < 0 ? 'overdue' : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`);

/**
 * The vehicle intelligence summary: one place where reminders, history, spend and odometer meet.
 * Every line comes from a real backend value. When a value does not exist the line says what is
 * missing and how to add it. Nothing is estimated or invented (no guessed odometer, no made-up
 * cost per km).
 *
 * Each line: { key, label, value, hint?, tone: 'ok' | 'attention' | 'muted', action? }
 * `action` is a navigation intent the screen maps to a route.
 */
export function deriveVehicleIntelligence({ reminders = [], timeline = [], cost = null, odometer = null, loaded = true }) {
  if (!loaded) return [];
  const lines = [];

  // 1. What needs attention first
  const pending = reminders.filter((r) => r.urgency !== 'OK').sort((a, b) => a.days_remaining - b.days_remaining);
  if (pending.length > 0) {
    const next = pending[0];
    const extra = pending.length - 1;
    lines.push({
      key: 'attention',
      label: 'Needs attention',
      value: `${REMINDER_LABEL[next.type] || next.type} ${dueText(next.days_remaining)}`,
      hint: extra > 0 ? `${extra} more reminder${extra === 1 ? '' : 's'} coming up` : `Due ${formatShortDate(next.due_date)}`,
      tone: 'attention',
      action: { type: 'reminders' },
    });
  } else if (reminders.length > 0) {
    lines.push({ key: 'attention', label: 'Needs attention', value: 'All clear', hint: 'Nothing due in the next 15 days', tone: 'ok' });
  } else {
    lines.push({
      key: 'attention',
      label: 'Needs attention',
      value: 'No dates set',
      hint: 'Add insurance, PUC and service dates to get reminders',
      tone: 'muted',
      action: { type: 'edit' },
    });
  }

  // 2. Odometer: only ever a recorded reading
  if (odometer?.km != null) {
    lines.push({
      key: 'odometer',
      label: 'Odometer',
      value: `${odometer.km.toLocaleString('en-IN')} km`,
      hint: `Recorded ${formatShortDate(odometer.as_of)}`,
      tone: 'ok',
    });
  } else {
    lines.push({
      key: 'odometer',
      label: 'Odometer',
      value: 'Not recorded',
      hint: 'Log a service record with an odometer reading',
      tone: 'muted',
      action: { type: 'service-record' },
    });
  }

  // 3. Spend this period, and what it costs per km when that can really be measured
  const monthly = cost?.by_month?.[cost.by_month.length - 1];
  if (cost && cost.all_time_total > 0) {
    lines.push({
      key: 'spend',
      label: 'Spending',
      value: formatINR(monthly?.total || 0),
      hint: `logged this month · ${formatINR(cost.all_time_total)} in total`,
      tone: 'ok',
      action: { type: 'cost' },
    });
  } else {
    lines.push({
      key: 'spend',
      label: 'Spending',
      value: 'Nothing logged',
      hint: 'Log an expense to see what this vehicle costs',
      tone: 'muted',
      action: { type: 'expense' },
    });
  }

  if (cost?.cost_per_km != null) {
    lines.push({
      key: 'cost-per-km',
      label: 'Cost per km',
      value: `${formatINR2(cost.cost_per_km)} / km`,
      hint: 'Measured from your own odometer readings',
      tone: 'ok',
      action: { type: 'cost' },
    });
  } else {
    lines.push({
      key: 'cost-per-km',
      label: 'Cost per km',
      value: 'Not enough data yet',
      hint: 'Needs two odometer readings at least 100 km apart',
      tone: 'muted',
    });
  }

  // 4. The latest thing that actually happened
  const last = timeline[0];
  lines.push(
    last
      ? {
          key: 'activity',
          label: 'Latest activity',
          value: last.title,
          hint: [last.subtitle, formatShortDate(last.occurred_at)].filter(Boolean).join(' · '),
          tone: 'ok',
          action: { type: 'timeline' },
        }
      : { key: 'activity', label: 'Latest activity', value: 'No activity yet', hint: 'Bookings, expenses and service records will appear here', tone: 'muted' }
  );

  return lines;
}
