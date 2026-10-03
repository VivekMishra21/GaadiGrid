import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from '../api/vehiclesApi';

export const SELECTED_VEHICLE_KEY = 'gaadigrid_selected_vehicle_id';

// The vehicle every screen (Home, Garage, Booking, Explore...) is currently about. It is a
// client-side choice persisted on the device — switching vehicles must not rewrite the
// backend's `is_default` flag. Falls back to the default vehicle, then the first one.
export function selectCurrentVehicle(state) {
  return (
    state.vehicles.find((v) => v.id === state.selectedVehicleId) ||
    state.vehicles.find((v) => v.is_default) ||
    state.vehicles[0] ||
    null
  );
}

export const useVehicleStore = create((set, get) => ({
  vehicles: [],
  selectedVehicleId: null,
  selectionHydrated: false,
  status: 'idle', // 'idle' | 'loading' | 'loaded' | 'error'
  // Set once after the first fetch ever completes (success or failure) and never reset.
  // Navigation gating reads this instead of `status`, because `status` also flips to
  // 'loading' on every screen-level refresh (e.g. HomeScreen's own mount/pull-to-refresh) —
  // using `status` for gating caused the root navigator to unmount back to the Splash
  // screen every time any screen refetched vehicles.
  hasLoadedOnce: false,
  error: null,

  selectVehicle(id) {
    set({ selectedVehicleId: id });
    AsyncStorage.setItem(SELECTED_VEHICLE_KEY, String(id)).catch(() => {});
  },

  get defaultVehicle() {
    return get().vehicles.find((v) => v.is_default) || get().vehicles[0] || null;
  },

  async fetchVehicles() {
    set({ status: 'loading', error: null });
    try {
      const vehicles = await listVehicles();
      let { selectedVehicleId } = get();
      if (!get().selectionHydrated) {
        const saved = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY).catch(() => null);
        if (saved) selectedVehicleId = Number(saved);
      }
      if (!vehicles.some((v) => v.id === selectedVehicleId)) selectedVehicleId = null;
      set({ vehicles, selectedVehicleId, selectionHydrated: true, status: 'loaded', hasLoadedOnce: true });
      return vehicles;
    } catch (err) {
      set({ status: 'error', error: err, hasLoadedOnce: true });
      throw err;
    }
  },

  async addVehicle(payload) {
    const vehicle = await createVehicle(payload);
    set((state) => ({ vehicles: [...state.vehicles, vehicle] }));
    // A vehicle the user just added is the one they want to work with next.
    get().selectVehicle(vehicle.id);
    return vehicle;
  },

  async editVehicle(id, payload) {
    const updated = await updateVehicle(id, payload);
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === id ? updated : v)),
    }));
    return updated;
  },

  async removeVehicle(id) {
    await deleteVehicle(id);
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
      selectedVehicleId: state.selectedVehicleId === id ? null : state.selectedVehicleId,
    }));
  },
}));
