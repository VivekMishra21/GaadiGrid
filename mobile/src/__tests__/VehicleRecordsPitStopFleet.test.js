import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as Location from 'expo-location';

import { listMyBookings } from '../api/bookingsApi';
import { addFleetMember, attachFleetVehicle, createFleet, getFleetOverview, getMyFleet } from '../api/fleetApi';
import { findProvidersForNeed } from '../api/pitStopApi';
import {
  createServiceRecord,
  deleteServiceRecord,
  getVehicleCost,
  getVehiclePassport,
  getVehicleTimeline,
  listReminders,
  updateServiceRecord,
} from '../api/vehiclesApi';
import { PassportView } from '../components/PassportView';
import { FleetScreen } from '../screens/FleetScreen';
import { GarageScreen } from '../screens/GarageScreen';
import { PitStopScreen } from '../screens/PitStopScreen';
import { ServiceRecordFormScreen } from '../screens/ServiceRecordFormScreen';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { isFutureIsoDate, isValidIsoDate, todayIso } from '../utils/validators';

jest.mock('../api/vehiclesApi');
jest.mock('../api/bookingsApi');
jest.mock('../api/authApi');
jest.mock('../api/fleetApi');
jest.mock('../api/pitStopApi');
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const vehicle = { id: 1, brand: 'Maruti Suzuki', model: 'Swift', variant: 'VXI', registration_number: 'UP16AB1234', fuel_type: 'PETROL', is_default: true, fleet_account_id: null };
const navigation = { navigate: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => () => {}), getParent: () => ({ navigate: jest.fn() }) };

const passport = {
  identity: { vehicle_id: 1, registration_number: 'UP16AB1234', vehicle_type: 'CAR', brand: 'Maruti Suzuki', model: 'Swift', variant: 'VXI', fuel_type: 'PETROL', average_mileage: 18, on_gaadigrid_since: '2026-09-23T06:00:00Z' },
  latest_odometer: { km: 42100, as_of: '2026-09-24' },
  totals: { service_records: 2, completed_bookings: 1, expenses_logged: 3, total_logged_spend: 2499 },
  service_history: [
    { id: 11, vehicle_id: 1, booking_id: 5, expense_id: 8, source: 'BOOKING', service_type: 'CAR_WASH', title: 'Basic Exterior Wash', provider_name: 'Sparkle Auto Care', service_date: '2026-09-24', odometer_km: 42100, amount: 249, invoice_number: null, work_done: 'Foam wash', notes: null, created_at: '2026-09-24T10:00:00Z' },
    { id: 12, vehicle_id: 1, booking_id: null, expense_id: 9, source: 'MANUAL', service_type: 'GENERAL_SERVICE', title: 'Full service', provider_name: 'Local garage', service_date: '2026-08-10', odometer_km: null, amount: 4850, invoice_number: 'A-1', work_done: null, notes: null, created_at: '2026-08-10T10:00:00Z' },
  ],
  reminders: [],
  disclaimer: 'Built from the bookings, expenses and service records logged in GaadiGrid. It is not a registration certificate or proof of ownership.',
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: { id: 7, full_name: 'Aarav Sharma' }, status: 'signed_in' });
  useVehicleStore.setState({
    vehicles: [vehicle], selectedVehicleId: 1, selectionHydrated: true, status: 'loaded', hasLoadedOnce: true,
    fetchVehicles: jest.fn().mockResolvedValue([vehicle]),
  });
  listReminders.mockResolvedValue([]);
  getVehicleTimeline.mockResolvedValue([]);
  getVehicleCost.mockResolvedValue({ period_months: 6, period_total: 0, all_time_total: 0, average_per_month: 0, by_category: {}, by_month: [], completed_booking_spend: 0, completed_booking_count: 0, cost_per_km: null, cost_per_km_basis: null });
  getVehiclePassport.mockResolvedValue(passport);
  listMyBookings.mockResolvedValue({ items: [], meta: {} });
  getMyFleet.mockResolvedValue({ available: false, account: null });
});

describe('date validators', () => {
  it('accepts real ISO dates only and flags the future', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('28-02-2026')).toBe(false);
    expect(isFutureIsoDate('2999-01-01')).toBe(true);
    expect(isFutureIsoDate(todayIso())).toBe(false);
  });
});

describe('Service record form', () => {
  it('validates before calling the API', async () => {
    render(<ServiceRecordFormScreen navigation={navigation} route={{ params: { vehicle } }} />);
    fireEvent.press(screen.getByText('Save record'));
    expect(await screen.findByText('Enter what was done, e.g. "Full service"')).toBeTruthy();
    expect(createServiceRecord).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('What was done'), 'Full service');
    fireEvent.changeText(screen.getByLabelText('Date'), '2999-01-01');
    fireEvent.press(screen.getByText('Save record'));
    expect(await screen.findByText("The date can't be in the future")).toBeTruthy();
    expect(createServiceRecord).not.toHaveBeenCalled();
  });

  it('saves a manual record with its amount and odometer', async () => {
    createServiceRecord.mockResolvedValue({ id: 1 });
    render(<ServiceRecordFormScreen navigation={navigation} route={{ params: { vehicle } }} />);
    fireEvent.changeText(screen.getByLabelText('What was done'), 'Tyre change');
    fireEvent.changeText(screen.getByLabelText('Date'), '2026-09-01');
    fireEvent.changeText(screen.getByLabelText('Amount paid, ₹ (optional)'), '1,200');
    fireEvent.changeText(screen.getByLabelText('Odometer, km (optional)'), '41000');
    fireEvent.press(screen.getByText('Save record'));
    await waitFor(() => expect(createServiceRecord).toHaveBeenCalled());
    expect(createServiceRecord).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: 'Tyre change', service_date: '2026-09-01', amount: 1200, odometer_km: 41000, service_type: 'GENERAL_SERVICE' })
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('only lets a booking record change the fields the provider does not capture', async () => {
    updateServiceRecord.mockResolvedValue({});
    render(<ServiceRecordFormScreen navigation={navigation} route={{ params: { vehicle, record: passport.service_history[0] } }} />);
    expect(screen.getByText(/came from a completed booking/)).toBeTruthy();
    expect(screen.queryByLabelText('What was done')).toBeNull();
    expect(screen.queryByText('Delete this record')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Invoice number (optional)'), 'INV-9');
    fireEvent.press(screen.getByText('Save changes'));
    await waitFor(() => expect(updateServiceRecord).toHaveBeenCalledWith(11, { odometer_km: 42100, invoice_number: 'INV-9', work_done: 'Foam wash', notes: null }));
  });

  it('offers deletion only for records the user added', () => {
    render(<ServiceRecordFormScreen navigation={navigation} route={{ params: { vehicle, record: passport.service_history[1] } }} />);
    expect(screen.getByText('Delete this record')).toBeTruthy();
    expect(deleteServiceRecord).not.toHaveBeenCalled();
  });
});

describe('Vehicle passport', () => {
  it('shows identity, odometer, totals, history and the honest disclaimer', async () => {
    const onAddRecord = jest.fn();
    const onOpenRecord = jest.fn();
    render(<PassportView vehicle={vehicle} onAddRecord={onAddRecord} onOpenRecord={onOpenRecord} />);
    expect(await screen.findByText('VEHICLE PASSPORT')).toBeTruthy();
    expect(screen.getByText('42,100 km (24 Sept 2026)')).toBeTruthy();
    expect(screen.getByText('₹2,499')).toBeTruthy();
    expect(screen.getByText('Full service')).toBeTruthy();
    expect(screen.getByText('Booked on GaadiGrid')).toBeTruthy();
    expect(screen.getByText('Added by you')).toBeTruthy();
    expect(screen.getByText(/not a registration certificate/)).toBeTruthy();

    fireEvent.press(screen.getByText('+ Add record'));
    expect(onAddRecord).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Full service'));
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
  });

  it('says so when nothing is recorded instead of inventing history', async () => {
    getVehiclePassport.mockResolvedValue({ ...passport, latest_odometer: null, service_history: [], totals: { service_records: 0, completed_bookings: 0, expenses_logged: 0, total_logged_spend: 0 } });
    render(<PassportView vehicle={vehicle} onAddRecord={jest.fn()} onOpenRecord={jest.fn()} />);
    expect(await screen.findByText('Not recorded yet')).toBeTruthy();
    expect(screen.getByText(/No service records yet/)).toBeTruthy();
  });

  it('is reachable from My Garage and the cost tab shows a measured cost per km', async () => {
    getVehicleCost.mockResolvedValue({
      period_months: 6, period_total: 4000, all_time_total: 4000, average_per_month: 666.67, by_category: { FUEL: 4000 },
      by_month: [{ month: '2026-10', total: 4000, by_category: {} }], completed_booking_spend: 0, completed_booking_count: 0,
      cost_per_km: 4, cost_per_km_basis: { from_km: 40000, to_km: 41000, from_date: '2026-07-01', to_date: '2026-09-30', expense_total: 4000 },
    });
    render(<GarageScreen navigation={navigation} route={{ params: {} }} />);
    fireEvent.press(screen.getByText('Cost'));
    expect(await screen.findByText('About ₹4.00 per km')).toBeTruthy();
    expect(screen.getByText(/over 1,000 km/)).toBeTruthy();

    fireEvent.press(screen.getByText('Passport'));
    expect(await screen.findByText('VEHICLE PASSPORT')).toBeTruthy();
  });

  it('explains how to unlock cost per km when it cannot be measured', async () => {
    getVehicleCost.mockResolvedValue({ period_months: 6, period_total: 100, all_time_total: 100, average_per_month: 16.67, by_category: { FUEL: 100 }, by_month: [{ month: '2026-10', total: 100, by_category: {} }], completed_booking_spend: 0, completed_booking_count: 0, cost_per_km: null, cost_per_km_basis: null });
    render(<GarageScreen navigation={navigation} route={{ params: { tab: 'cost' } }} />);
    expect(await screen.findByText(/two odometer readings at least 100 km apart/)).toBeTruthy();
  });

  it('offers a visible Sign out at the top of My Garage that signs the user out after confirming', async () => {
    const logout = jest.fn();
    useAuthStore.setState({ logout });
    global.window = global.window || {};
    const confirmSpy = jest.fn().mockReturnValue(true);
    global.window.confirm = confirmSpy;
    const { Platform } = require('react-native');
    const original = Platform.OS;
    Platform.OS = 'web';
    try {
      render(<GarageScreen navigation={navigation} route={{ params: {} }} />);
      await act(async () => {});
      fireEvent.press(screen.getByTestId('garage-sign-out'));
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Sign out'));
      expect(logout).toHaveBeenCalledTimes(1);
    } finally {
      Platform.OS = original;
      delete global.window.confirm;
    }
  });

  it('shows the Fleet Pro entry only when the backend has it switched on', async () => {
    const off = render(<GarageScreen navigation={navigation} route={{ params: {} }} />);
    await act(async () => {});
    expect(screen.queryByText('Fleet Pro')).toBeNull();
    off.unmount();

    getMyFleet.mockResolvedValue({ available: true, account: null });
    render(<GarageScreen navigation={navigation} route={{ params: {} }} />);
    expect(await screen.findByText('Fleet Pro')).toBeTruthy();
  });
});

describe('Smart Pit Stop by need', () => {
  const provider = {
    id: 3, business_name: 'Near Tyres', address: 'x', city: 'Noida', locality: 'Sector 62', latitude: 28.5, longitude: 77.3,
    distance_km: 1.234, is_sponsored: true, verification_status: 'VERIFIED', average_rating: 4.2, review_count: 5,
    packages: [{ id: 1, category: 'TYRE_SERVICE', name: 'Tyre rotation', price: 500, duration_minutes: 45, is_doorstep: false }],
  };

  beforeEach(() => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 28.57, longitude: 77.32 } });
  });

  it('asks the backend for the chosen need near the real location and shows real packages', async () => {
    findProvidersForNeed.mockResolvedValue({ need: 'TYRE_SERVICE', radius_km: 10, providers: [provider] });
    render(<PitStopScreen navigation={navigation} />);
    expect(screen.getByText('Pick what you need to see partners nearby.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Tyres'));
    await waitFor(() => expect(findProvidersForNeed).toHaveBeenCalledWith({ need: 'TYRE_SERVICE', lat: 28.57, lng: 77.32, radiusKm: 10 }));
    expect(await screen.findByText('Near Tyres')).toBeTruthy();
    expect(screen.getByText('1.2 km')).toBeTruthy();
    expect(screen.getByText('Tyre rotation')).toBeTruthy();
    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('★ Sponsored')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Near Tyres, 1.234 kilometres away'));
    expect(navigation.navigate).toHaveBeenCalledWith('Services', { screen: 'ProviderDetail', params: { providerId: 3 } });
  });

  it('says plainly when no partner offers the need nearby', async () => {
    findProvidersForNeed.mockResolvedValue({ need: 'BATTERY_SERVICE', radius_km: 10, providers: [] });
    render(<PitStopScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Battery'));
    expect(await screen.findByText('No partners within 10 km')).toBeTruthy();
  });

  it('suggests a general service only when the vehicle really has a service due', async () => {
    listReminders.mockResolvedValue([{ vehicle_id: 1, registration_number: 'UP16AB1234', type: 'service', due_date: '2026-10-12', days_remaining: 10, urgency: 'DUE_SOON' }]);
    findProvidersForNeed.mockResolvedValue({ need: 'GENERAL_SERVICE', radius_km: 10, providers: [] });
    render(<PitStopScreen navigation={navigation} />);
    const suggestion = await screen.findByText(/Your service is due in 10 days/);
    fireEvent.press(suggestion);
    await waitFor(() => expect(findProvidersForNeed).toHaveBeenCalledWith(expect.objectContaining({ need: 'GENERAL_SERVICE' })));
  });

  it('asks for location instead of guessing when permission is off', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    render(<PitStopScreen navigation={navigation} />);
    expect(await screen.findByText('Allow location')).toBeTruthy();
    expect(findProvidersForNeed).not.toHaveBeenCalled();
  });
});

describe('Fleet Pro', () => {
  const owner = { user_id: 7, full_name: 'Aarav Sharma', role: 'OWNER', added_at: '2026-10-01T00:00:00Z' };
  const account = { id: 4, company_name: 'City Cabs', is_active: true, created_at: '2026-10-01T00:00:00Z', vehicles: [], members: [owner] };
  const overview = {
    account, your_role: 'OWNER', period_months: 6, total_spend_period: 1500,
    vehicles: [{ vehicle: { ...vehicle, id: 9, registration_number: 'DL01CA0001', fleet_account_id: 4 }, reminders: [{ vehicle_id: 9, registration_number: 'DL01CA0001', type: 'insurance', due_date: '2026-10-08', days_remaining: 5, urgency: 'DUE_SOON' }], spend_period: 1500, latest_odometer_km: 51000 }],
    upcoming_reminders: [{ vehicle_id: 9, registration_number: 'DL01CA0001', type: 'insurance', due_date: '2026-10-08', days_remaining: 5, urgency: 'DUE_SOON' }],
  };

  it('tells the user when Fleet Pro is switched off', async () => {
    render(<FleetScreen navigation={navigation} />);
    expect(await screen.findByText("Fleet Pro isn't available yet.")).toBeTruthy();
  });

  it('lets a user with no fleet create one', async () => {
    getMyFleet.mockResolvedValueOnce({ available: true, account: null }).mockResolvedValue({ available: true, account });
    createFleet.mockResolvedValue(account);
    getFleetOverview.mockResolvedValue(overview);
    render(<FleetScreen navigation={navigation} />);
    expect(await screen.findByText('Create your fleet account')).toBeTruthy();

    fireEvent.press(screen.getByText('Create fleet'));
    expect(await screen.findByText('Enter your company or fleet name.')).toBeTruthy();
    expect(createFleet).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Company or fleet name'), 'City Cabs');
    fireEvent.press(screen.getByText('Create fleet'));
    await waitFor(() => expect(createFleet).toHaveBeenCalledWith('City Cabs'));
  });

  it('shows the owner real fleet spend, dues, vehicles to add and team tools', async () => {
    getMyFleet.mockResolvedValue({ available: true, account });
    getFleetOverview.mockResolvedValue(overview);
    attachFleetVehicle.mockResolvedValue({});
    addFleetMember.mockResolvedValue({});
    render(<FleetScreen navigation={navigation} />);

    expect((await screen.findAllByText('₹1,500')).length).toBeGreaterThan(0);
    expect(screen.getByText('logged across 1 vehicle in the last 6 months')).toBeTruthy();
    expect(screen.getAllByText('DL01CA0001').length).toBeGreaterThan(0);
    expect(screen.getByText('Add from your garage')).toBeTruthy();

    fireEvent.press(screen.getByText('Add'));
    await waitFor(() => expect(attachFleetVehicle).toHaveBeenCalledWith(4, 1));

    fireEvent.changeText(screen.getByLabelText('Add a team member by email'), 'not-an-email');
    fireEvent.press(screen.getByText('Add member'));
    expect(await screen.findByText('Enter the email they signed up with.')).toBeTruthy();
    expect(addFleetMember).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Add a team member by email'), 'mgr@fleet.test');
    fireEvent.press(screen.getByLabelText('Manager'));
    fireEvent.press(screen.getByText('Add member'));
    await waitFor(() => expect(addFleetMember).toHaveBeenCalledWith(4, 'mgr@fleet.test', 'MANAGER'));
  });

  it('keeps fleet-wide cost away from drivers', async () => {
    getMyFleet.mockResolvedValue({ available: true, account: { ...account, members: [{ ...owner, user_id: 7, role: 'DRIVER' }] } });
    render(<FleetScreen navigation={navigation} />);
    expect(await screen.findByText(/You are a driver on this fleet/)).toBeTruthy();
    expect(getFleetOverview).not.toHaveBeenCalled();
  });
});
