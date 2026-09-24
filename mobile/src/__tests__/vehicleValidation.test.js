import { normalizeRegistrationNumber, validateVehicleForm } from '../constants/vehicle';

const VALID_FORM = {
  vehicleType: 'CAR',
  registrationNumber: 'DL01AB1234',
  brand: 'Maruti Suzuki',
  model: 'Swift',
  fuelType: 'PETROL',
  averageMileage: '18.5',
};

describe('normalizeRegistrationNumber', () => {
  it('uppercases and strips spaces/dashes', () => {
    expect(normalizeRegistrationNumber('dl 01-ab 1234')).toBe('DL01AB1234');
  });
});

describe('validateVehicleForm', () => {
  it('accepts a fully valid form with no errors', () => {
    expect(validateVehicleForm(VALID_FORM)).toEqual({});
  });

  it('rejects an invalid registration number', () => {
    const errors = validateVehicleForm({ ...VALID_FORM, registrationNumber: 'not-a-plate' });
    expect(errors.registrationNumber).toBeDefined();
  });

  it('rejects an unrealistic mileage value', () => {
    const errors = validateVehicleForm({ ...VALID_FORM, averageMileage: '5000' });
    expect(errors.averageMileage).toBeDefined();
  });

  it('rejects a zero or negative mileage', () => {
    expect(validateVehicleForm({ ...VALID_FORM, averageMileage: '0' }).averageMileage).toBeDefined();
    expect(validateVehicleForm({ ...VALID_FORM, averageMileage: '-5' }).averageMileage).toBeDefined();
  });

  it('allows an empty mileage (optional field)', () => {
    expect(validateVehicleForm({ ...VALID_FORM, averageMileage: '' }).averageMileage).toBeUndefined();
  });

  it('rejects a missing brand', () => {
    expect(validateVehicleForm({ ...VALID_FORM, brand: '' }).brand).toBeDefined();
  });

  it('rejects an invalid fuel type', () => {
    expect(validateVehicleForm({ ...VALID_FORM, fuelType: 'NUCLEAR' }).fuelType).toBeDefined();
  });

  it('rejects an invalid vehicle type', () => {
    expect(validateVehicleForm({ ...VALID_FORM, vehicleType: 'SPACESHIP' }).vehicleType).toBeDefined();
  });
});
