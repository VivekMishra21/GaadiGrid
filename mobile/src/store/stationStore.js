import { create } from 'zustand';

import { getStation, listFuelTypes, searchStations, toggleFavoriteStation } from '../api/stationsApi';

export const useStationStore = create((set, get) => ({
  stations: [],
  status: 'idle', // 'idle' | 'loading' | 'loaded' | 'error'
  error: null,

  fuelTypes: [],

  filters: { city: '', q: '', fuel_type: null, lat: null, lng: null, radius_km: null },

  stationDetail: null,
  stationDetailStatus: 'idle',

  setFilters(partial) {
    set((state) => ({ filters: { ...state.filters, ...partial } }));
  },

  async fetchFuelTypes() {
    const fuelTypes = await listFuelTypes();
    set({ fuelTypes });
    return fuelTypes;
  },

  async search() {
    set({ status: 'loading', error: null });
    try {
      const { filters } = get();
      const params = {};
      if (filters.lat != null) params.lat = filters.lat;
      if (filters.lng != null) params.lng = filters.lng;
      if (filters.radius_km != null) params.radius_km = filters.radius_km;
      if (filters.city) params.city = filters.city;
      if (filters.q) params.q = filters.q;
      if (filters.fuel_type) params.fuel_type = filters.fuel_type;

      const res = await searchStations(params);
      set({ stations: res.items, status: 'loaded' });
      return res.items;
    } catch (err) {
      set({ status: 'error', error: err });
      throw err;
    }
  },

  async fetchStationDetail(id) {
    set({ stationDetailStatus: 'loading' });
    try {
      const station = await getStation(id);
      set({ stationDetail: station, stationDetailStatus: 'loaded' });
      return station;
    } catch (err) {
      set({ stationDetailStatus: 'error' });
      throw err;
    }
  },

  async toggleFavorite(id) {
    const { is_favorite: isFavorite } = await toggleFavoriteStation(id);
    set((state) => ({
      stations: state.stations.map((s) => (s.id === id ? { ...s, is_favorite: isFavorite } : s)),
      stationDetail:
        state.stationDetail && state.stationDetail.id === id
          ? { ...state.stationDetail, is_favorite: isFavorite }
          : state.stationDetail,
    }));
    return isFavorite;
  },
}));
