export function formatINR(amount) {
  const value = Number(amount) || 0;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

// Small per-unit amounts (e.g. cost per km) lose their meaning when rounded to whole rupees.
export function formatINR2(amount) {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMonthLabel(yyyyMm) {
  const [year, month] = yyyyMm.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

export function vehicleTitle(vehicle) {
  return vehicle ? `${vehicle.brand} ${vehicle.model}` : '';
}

const FUEL_LABELS = { PETROL: 'Petrol', DIESEL: 'Diesel', CNG: 'CNG', EV: 'EV', HYBRID: 'Hybrid' };
export function fuelLabel(code) {
  return FUEL_LABELS[code] || code;
}

// Station search only knows these fuels; a hybrid still refuels with petrol.
export function stationFuelForVehicle(vehicle) {
  if (!vehicle) return null;
  return vehicle.fuel_type === 'HYBRID' ? 'PETROL' : vehicle.fuel_type;
}
