import { useCallback, useEffect, useState } from 'react';

import { getVehicleCost, getVehiclePassport, getVehicleTimeline, listReminders } from '../api/vehiclesApi';

const EMPTY = { status: 'idle', reminders: [], timeline: [], cost: null, odometer: null, failed: false };

// Everything the backend knows about one vehicle's reminders, history and cost. Each part
// loads independently so one failing endpoint doesn't blank the rest — `failed` tells the
// screen to offer a retry instead of presenting missing data as "nothing here".
// `withOdometer` also reads the passport for the latest recorded odometer (only the Garage needs it).
export function useVehicleInsights(vehicleId, { timelineLimit = 50, months = 6, withOdometer = false } = {}) {
  const [state, setState] = useState(EMPTY);

  const load = useCallback(() => {
    if (!vehicleId) {
      setState(EMPTY);
      return Promise.resolve();
    }
    setState((s) => ({ ...s, status: 'loading', failed: false }));
    return Promise.allSettled([
      listReminders(vehicleId),
      getVehicleTimeline(vehicleId, timelineLimit),
      getVehicleCost(vehicleId, months),
      withOdometer ? getVehiclePassport(vehicleId) : Promise.resolve(null),
    ]).then(([reminders, timeline, cost, passport]) => {
      setState({
        status: 'loaded',
        reminders: reminders.status === 'fulfilled' ? reminders.value : [],
        timeline: timeline.status === 'fulfilled' ? timeline.value : [],
        cost: cost.status === 'fulfilled' ? cost.value : null,
        odometer: passport.status === 'fulfilled' ? passport.value?.latest_odometer ?? null : null,
        failed: [reminders, timeline, cost, passport].some((r) => r.status === 'rejected'),
      });
    });
  }, [vehicleId, timelineLimit, months, withOdometer]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
