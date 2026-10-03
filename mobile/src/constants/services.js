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

// Mirrors the website's Car Wash / Vehicle Care split (website/src/lib/backend/types.ts).
export const SERVICE_GROUPS = {
  CAR_WASH: { label: 'Car Wash', categories: ['CAR_WASH', 'DETAILING'] },
  VEHICLE_CARE: {
    label: 'Vehicle Care',
    categories: ['AC_SERVICE', 'DENTING_PAINTING', 'GENERAL_SERVICE', 'TYRE_SERVICE', 'BATTERY_SERVICE', 'OTHER'],
  },
};

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
