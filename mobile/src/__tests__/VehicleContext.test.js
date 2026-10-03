import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { listMyBookings } from '../api/bookingsApi';
import { getUnreadCount } from '../api/notificationsApi';
import { getVehicleCost, getVehicleTimeline, listReminders, listVehicles } from '../api/vehiclesApi';
import { VehicleSwitcher } from '../components/VehicleSwitcher';
import { GarageScreen } from '../screens/GarageScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { useAuthStore } from '../store/authStore';
import { SELECTED_VEHICLE_KEY, selectCurrentVehicle, useVehicleStore } from '../store/vehicleStore';
import { formatINR, stationFuelForVehicle } from '../utils/format';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../api/vehiclesApi');
jest.mock('../api/bookingsApi');
jest.mock('../api/notificationsApi');
jest.mock('../api/authApi');

const creta = { id: 2, brand: 'Hyundai', model: 'Creta', variant: 'SX', registration_number: 'UP16CD2222', fuel_type: 'DIESEL', is_default: false };
const victoris = { id: 1, brand: 'Maruti Suzuki', model: 'Victoris', variant: null, registration_number: 'UP16AB1111', fuel_type: 'CNG', is_default: true };

const emptyCost = {
  period_months: 6, period_total: 0, all_time_total: 0, average_per_month: 0, by_category: {}, by_month: [],
  completed_booking_spend: 0, completed_booking_count: 0,
};

function seedStore(overrides = {}) {
  useVehicleStore.setState({
    vehicles: [victoris, creta],
    selectedVehicleId: null,
    selectionHydrated: true,
    status: 'loaded',
    hasLoadedOnce: true,
    fetchVehicles: jest.fn().mockResolvedValue([victoris, creta]),
    ...overrides,
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAuthStore.setState({ user: { full_name: 'Aarav Sharma', phone: '+919810000001' }, status: 'signed_in' });
  listReminders.mockResolvedValue([]);
  getVehicleTimeline.mockResolvedValue([]);
  getVehicleCost.mockResolvedValue(emptyCost);
  getUnreadCount.mockResolvedValue({ unread_count: 0 });
  listMyBookings.mockResolvedValue({ items: [], meta: {} });
});

describe('selected vehicle', () => {
  it('falls back from the chosen vehicle to the default, then the first', () => {
    const state = { vehicles: [creta, victoris], selectedVehicleId: null };
    expect(selectCurrentVehicle(state).id).toBe(1);
    expect(selectCurrentVehicle({ ...state, selectedVehicleId: 2 }).id).toBe(2);
    expect(selectCurrentVehicle({ vehicles: [creta], selectedVehicleId: 99 }).id).toBe(2);
    expect(selectCurrentVehicle({ vehicles: [], selectedVehicleId: null })).toBeNull();
  });

  it('restores the saved choice after a fetch and drops one that no longer exists', async () => {
    useVehicleStore.setState({ vehicles: [], selectedVehicleId: null, selectionHydrated: false });
    listVehicles.mockResolvedValue([victoris, creta]);
    await AsyncStorage.setItem(SELECTED_VEHICLE_KEY, '2');
    await useVehicleStore.getState().fetchVehicles();
    expect(useVehicleStore.getState().selectedVehicleId).toBe(2);

    useVehicleStore.setState({ selectionHydrated: false });
    await AsyncStorage.setItem(SELECTED_VEHICLE_KEY, '77');
    await useVehicleStore.getState().fetchVehicles();
    expect(useVehicleStore.getState().selectedVehicleId).toBeNull();
  });

  it('persists a switch on the device without touching the backend default', async () => {
    seedStore();
    render(<VehicleSwitcher />);
    fireEvent.press(screen.getByLabelText('Hyundai Creta, UP16CD2222'));
    expect(useVehicleStore.getState().selectedVehicleId).toBe(2);
    await act(async () => {});
    expect(await AsyncStorage.getItem(SELECTED_VEHICLE_KEY)).toBe('2');
    expect(useVehicleStore.getState().vehicles.find((v) => v.id === 1).is_default).toBe(true);
  });

  it('renders nothing when there is a single vehicle and no add action', () => {
    seedStore({ vehicles: [victoris] });
    const { toJSON } = render(<VehicleSwitcher />);
    expect(toJSON()).toBeNull();
  });
});

describe('format helpers', () => {
  it('formats rupees and maps a hybrid to petrol for station search', () => {
    expect(formatINR(4850)).toBe('₹4,850');
    expect(formatINR(null)).toBe('₹0');
    expect(stationFuelForVehicle({ fuel_type: 'HYBRID' })).toBe('PETROL');
    expect(stationFuelForVehicle(victoris)).toBe('CNG');
    expect(stationFuelForVehicle(null)).toBeNull();
  });
});

describe('Home (vehicle first)', () => {
  it('shows the selected vehicle and only what the backend returned for it', async () => {
    seedStore({ selectedVehicleId: 2 });
    listReminders.mockResolvedValue([
      { vehicle_id: 2, registration_number: 'UP16CD2222', type: 'insurance', due_date: '2026-10-08', days_remaining: 5, urgency: 'DUE_SOON' },
    ]);
    getVehicleTimeline.mockResolvedValue([
      { kind: 'EXPENSE', occurred_at: '2026-10-01T00:00:00+05:30', title: 'Fuel', subtitle: null, amount: 2100, status: null, category: 'FUEL', ref_id: 7 },
    ]);
    getVehicleCost.mockResolvedValue({
      ...emptyCost, all_time_total: 2100, period_total: 2100, average_per_month: 350,
      by_month: [{ month: '2026-10', total: 2100, by_category: {} }],
    });

    render(<HomeScreen />);
    // The name appears in the switcher pill and on the vehicle card; the plate only on the card.
    expect(screen.getAllByText('Hyundai Creta')).toHaveLength(2);
    expect(screen.getByText('UP16CD2222')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Insurance')).toBeTruthy());
    expect(screen.getByText('5 days left')).toBeTruthy();
    expect(screen.getByText('Fuel')).toBeTruthy();
    expect(screen.getAllByText('₹2,100').length).toBeGreaterThan(0);
    expect(listReminders).toHaveBeenCalledWith(2);
  });

  it('is honest when a vehicle has no dates, activity or expenses', async () => {
    seedStore({ selectedVehicleId: 1 });
    render(<HomeScreen />);
    await waitFor(() => expect(screen.getByText(/Add the insurance, PUC and service dates/)).toBeTruthy());
    expect(screen.getByText(/No activity yet/)).toBeTruthy();
    expect(screen.getByText('No expenses logged for this vehicle yet.')).toBeTruthy();
  });

  it('sends quick actions to the right modules', async () => {
    seedStore();
    render(<HomeScreen />);
    fireEvent.press(screen.getByText('Fuel & CNG'));
    expect(mockNavigate).toHaveBeenCalledWith('Explore');
    fireEvent.press(screen.getByText('Vehicle care'));
    expect(mockNavigate).toHaveBeenCalledWith('Services', { screen: 'ServicesList', params: { group: 'VEHICLE_CARE' } });
    fireEvent.press(screen.getByText('Pit stop'));
    expect(mockNavigate).toHaveBeenCalledWith('Explore', { screen: 'PitStop' });
    await waitFor(() => expect(getVehicleCost).toHaveBeenCalled());
  });

  it('invites a user with no vehicle to add one instead of showing empty modules', () => {
    seedStore({ vehicles: [], status: 'loaded', fetchVehicles: jest.fn().mockResolvedValue([]) });
    render(<HomeScreen />);
    expect(screen.getByText('Start with your car')).toBeTruthy();
    fireEvent.press(screen.getByText('Add your vehicle'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile', { screen: 'VehicleForm', params: { mode: 'add' } });
    expect(listReminders).not.toHaveBeenCalled();
  });
});

describe('My Garage', () => {
  const navigation = { navigate: jest.fn(), getParent: () => ({ navigate: jest.fn() }) };

  it('shows details, then the timeline and cost tabs from real data', async () => {
    seedStore({ selectedVehicleId: 1 });
    getVehicleTimeline.mockResolvedValue([
      { kind: 'BOOKING', occurred_at: '2026-10-02T10:00:00+05:30', title: 'Basic Wash', subtitle: 'Sparkle', amount: 349, status: 'COMPLETED', category: 'CAR_WASH', ref_id: 3 },
    ]);
    getVehicleCost.mockResolvedValue({
      ...emptyCost, all_time_total: 6950, period_total: 6950, average_per_month: 1158.33,
      by_category: { FUEL: 2100, SERVICE: 4850 },
      by_month: [{ month: '2026-10', total: 6950, by_category: {} }],
      completed_booking_spend: 349, completed_booking_count: 1,
    });
    listMyBookings.mockResolvedValue({ items: [{ id: 3, package_name: 'Basic Wash', provider_name: 'Sparkle', scheduled_at: '2026-10-02T10:00:00+05:30', status: 'COMPLETED' }], meta: {} });

    render(<GarageScreen navigation={navigation} route={{ params: {} }} />);
    expect(screen.getByText('My Garage')).toBeTruthy();
    expect(screen.getAllByText('Maruti Suzuki Victoris').length).toBeGreaterThan(0);
    await waitFor(() => expect(listMyBookings).toHaveBeenCalledWith(1, 1));
    expect(await screen.findByText('Completed')).toBeTruthy();

    fireEvent.press(screen.getByText('Timeline'));
    expect(await screen.findByText(/Basic Wash/)).toBeTruthy();
    expect(screen.getByText('₹349')).toBeTruthy();

    fireEvent.press(screen.getByText('Cost'));
    expect(await screen.findByText('₹6,950')).toBeTruthy();
    expect(screen.getByText('₹4,850')).toBeTruthy();
    expect(screen.getByText(/1 completed GaadiGrid booking/)).toBeTruthy();
    expect(screen.getByText(/Cost per kilometre appears once two odometer readings/)).toBeTruthy();
  });

  it('opens on the tab requested by Home and never invents cost for an empty vehicle', async () => {
    seedStore({ selectedVehicleId: 1 });
    render(<GarageScreen navigation={navigation} route={{ params: { tab: 'cost' } }} />);
    expect(await screen.findByText(/No expenses logged for this vehicle yet, so there is no cost to show/)).toBeTruthy();
    await act(async () => {});
  });
});
