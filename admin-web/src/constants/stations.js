export const FUEL_TYPE_CODES = ['PETROL', 'DIESEL', 'CNG', 'EV'];

export const FACILITY_CODES = [
  'AIR',
  'NITROGEN',
  'WASHROOM',
  'DRINKING_WATER',
  'PUC',
  'ATM',
  'UPI',
  'CARD_PAYMENT',
  'CONVENIENCE_STORE',
  'CAR_WASH',
  'WHEELCHAIR_ACCESSIBLE',
];

export function facilityLabel(code) {
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
