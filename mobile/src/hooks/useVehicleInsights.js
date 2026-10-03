import { useCallback, useEffect, useState } from 'react';

import { getVehicleCost, getVehicleTimeline, listReminders } from '../api/vehiclesApi';

const EMPTY = { status: 'idle', reminders: [], timeline: [], cost: null, failed: false };

// Everything the backend knows about one vehicle's reminders, history and cost. Each part
// loads independently so one failing endpoint doesn't blank the rest — `failed` tells the
// screen to offer a retry instead of presenting missing data as "nothing here".
export function useVehicleInsights(vehicleId, { timelineLimit = 50, months = 6 } = {}) {
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
    ]).then(([reminders, timeline, cost]) => {
      setState({
        status: 'loaded',
        reminders: reminders.status === 'fulfilled' ? reminders.value : [],
        timeline: timeline.status === 'fulfilled' ? timeline.value : [],
        cost: cost.status === 'fulfilled' ? cost.value : null,
        failed: [reminders, timeline, cost].some((r) => r.status === 'rejected'),
      });
    });
  }, [vehicleId, timelineLimit, months]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
