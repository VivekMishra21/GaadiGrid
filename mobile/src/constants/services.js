export const SERVICE_CATEGORIES = [
  { value: null, label: 'All' },
  { value: 'CAR_WASH', label: 'Car wash' },
  { value: 'DETAILING', label: 'Detailing' },
  { value: 'AC_SERVICE', label: 'AC service' },
  { value: 'DENTING_PAINTING', label: 'Denting & painting' },
  { value: 'GENERAL_SERVICE', label: 'General service' },
  { value: 'TYRE_SERVICE', label: 'Tyres' },
  { value: 'BATTERY_SERVICE', label: 'Battery' },
  { value: 'OTHER', label: 'Other' },
];

export function categoryLabel(value) {
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export const BOOKING_STATUS_LABELS = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Declined',
};
