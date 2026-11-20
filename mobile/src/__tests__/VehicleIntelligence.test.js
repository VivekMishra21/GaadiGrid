import { fireEvent, render, screen } from '@testing-library/react-native';

import { VehicleIntelligenceCard } from '../components/vehicle/VehicleIntelligenceCard';
import { deriveVehicleIntelligence } from '../features/garage/intelligence';

const byKey = (lines) => Object.fromEntries(lines.map((l) => [l.key, l]));

const full = {
  reminders: [
    { vehicle_id: 1, type: 'puc', due_date: '2026-12-01', days_remaining: 9, urgency: 'DUE_SOON' },
    { vehicle_id: 1, type: 'insurance', due_date: '2027-03-01', days_remaining: 100, urgency: 'OK' },
  ],
  timeline: [{ kind: 'EXPENSE', ref_id: 1, title: 'Fuel', subtitle: 'Petrol', occurred_at: '2026-11-15T00:00:00Z' }],
  cost: { all_time_total: 4000, by_month: [{ month: '2026-11', total: 1500 }], cost_per_km: 4.25 },
  odometer: { km: 41250, as_of: '2026-11-10' },
};

describe('deriveVehicleIntelligence', () => {
  it('shows nothing until the data has loaded', () => {
    expect(deriveVehicleIntelligence({ loaded: false })).toEqual([]);
  });

  it('puts the most urgent reminder first and uses only real values', () => {
    const l = byKey(deriveVehicleIntelligence(full));
    expect(l.attention.value).toBe('PUC due in 9 days');
    expect(l.attention.tone).toBe('attention');
    expect(l.odometer.value).toBe('41,250 km');
    expect(l.spend.hint).toMatch(/4,000 in total/);
    expect(l['cost-per-km'].value).toContain('4.25');
    expect(l.activity.value).toBe('Fuel');
  });

  it('orders overdue before upcoming and counts the rest', () => {
    const l = byKey(
      deriveVehicleIntelligence({
        ...full,
        reminders: [
          { type: 'service', due_date: '2026-12-20', days_remaining: 30, urgency: 'DUE_SOON' },
          { type: 'insurance', due_date: '2026-11-01', days_remaining: -19, urgency: 'OVERDUE' },
        ],
      })
    );
    expect(l.attention.value).toBe('Insurance overdue');
    expect(l.attention.hint).toBe('1 more reminder coming up');
  });

  it('never invents numbers: missing data says so and points to how to add it', () => {
    const l = byKey(deriveVehicleIntelligence({ reminders: [], timeline: [], cost: null, odometer: null }));
    expect(l.attention.value).toBe('No dates set');
    expect(l.odometer.value).toBe('Not recorded');
    expect(l.odometer.action).toEqual({ type: 'service-record' });
    expect(l.spend.value).toBe('Nothing logged');
    expect(l['cost-per-km'].value).toBe('Not enough data yet');
    expect(l['cost-per-km'].hint).toMatch(/two odometer readings at least 100 km apart/);
    expect(l.activity.value).toBe('No activity yet');
  });

  it('reports all clear when reminders exist but none are due', () => {
    const l = byKey(deriveVehicleIntelligence({ ...full, reminders: [full.reminders[1]] }));
    expect(l.attention.value).toBe('All clear');
    expect(l.attention.tone).toBe('ok');
  });
});

describe('VehicleIntelligenceCard', () => {
  it('sends tapped lines to where the data lives', () => {
    const onAction = jest.fn();
    render(<VehicleIntelligenceCard data={{ ...full, loaded: true }} onAction={onAction} />);
    fireEvent.press(screen.getByTestId('intel-spend'));
    expect(onAction).toHaveBeenCalledWith({ type: 'cost' });
    fireEvent.press(screen.getByTestId('intel-activity'));
    expect(onAction).toHaveBeenCalledWith({ type: 'timeline' });
  });

  it('renders nothing while loading', () => {
    render(<VehicleIntelligenceCard data={{ loaded: false }} />);
    expect(screen.queryByTestId('vehicle-intelligence')).toBeNull();
  });
});
