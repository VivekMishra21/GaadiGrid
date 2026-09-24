import { create } from 'zustand';

import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from '../api/vehiclesApi';

export const useVehicleStore = create((set, get) => ({
  vehicles: [],
  status: 'idle', // 'idle' | 'loading' | 'loaded' | 'error'
  // Set once after the first fetch ever completes (success or failure) and never reset.
  // Navigation gating reads this instead of `status`, because `status` also flips to
  // 'loading' on every screen-level refresh (e.g. HomeScreen's own mount/pull-to-refresh) —
  // using `status` for gating caused the root navigator to unmount back to the Splash
  // screen every time any screen refetched vehicles.
  hasLoadedOnce: false,
  error: null,

  get defaultVehicle() {
    return get().vehicles.find((v) => v.is_default) || get().vehicles[0] || null;
  },

  async fetchVehicles() {
    set({ status: 'loading', error: null });
    try {
      const vehicles = await listVehicles();
      set({ vehicles, status: 'loaded', hasLoadedOnce: true });
      return vehicles;
    } catch (err) {
      set({ status: 'error', error: err, hasLoadedOnce: true });
      throw err;
    }
  },

  async addVehicle(payload) {
    const vehicle = await createVehicle(payload);
    set((state) => ({ vehicles: [...state.vehicles, vehicle] }));
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
    set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) }));
  },
}));
