export const VEHICLE_TYPES = [
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'AUTO_RICKSHAW', label: 'Auto rickshaw' },
  { value: 'COMMERCIAL', label: 'Commercial' },
];

export const FUEL_TYPES = [
  { value: 'PETROL', label: 'Petrol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'CNG', label: 'CNG' },
  { value: 'EV', label: 'EV' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const REGISTRATION_PATTERN = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;

export function normalizeRegistrationNumber(value) {
  return (value || '').toUpperCase().replace(/\s|-/g, '');
}

export function validateVehicleForm({ vehicleType, registrationNumber, brand, model, fuelType, averageMileage }) {
  const errors = {};

  if (!VEHICLE_TYPES.some((t) => t.value === vehicleType)) {
    errors.vehicleType = 'Select a vehicle type.';
  }

  const normalizedReg = normalizeRegistrationNumber(registrationNumber);
  if (!REGISTRATION_PATTERN.test(normalizedReg)) {
    errors.registrationNumber = 'Enter a valid registration number, e.g. DL01AB1234.';
  }

  if (!brand || !brand.trim()) {
    errors.brand = 'Brand is required.';
  }

  if (!model || !model.trim()) {
    errors.model = 'Model is required.';
  }

  if (!FUEL_TYPES.some((t) => t.value === fuelType)) {
    errors.fuelType = 'Select a fuel type.';
  }

  if (averageMileage !== '' && averageMileage != null) {
    const num = Number(averageMileage);
    if (Number.isNaN(num) || num <= 0 || num > 300) {
      errors.averageMileage = 'Enter a realistic mileage between 1 and 300.';
    }
  }

  return errors;
}
