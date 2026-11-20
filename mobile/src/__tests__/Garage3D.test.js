import { render, screen } from '@testing-library/react-native';

import { VehicleHero } from '../components/vehicle/VehicleHero';
import { VehicleViewer } from '../components/vehicle/VehicleViewer';
import { TurntableState } from '../features/garage/turntable';
import { modelKey, resolveModel, VEHICLE_MODELS } from '../features/garage/vehicleModels';
import { renderQualityFor } from '../hooks/useRenderQuality';

const swift = { brand: 'Maruti Suzuki', model: 'Swift', variant: 'VXI', registration_number: 'UP16AB1234', fuel_type: 'PETROL', vehicle_type: 'CAR' };
const GB = 1024 ** 3;

describe('vehicle model registry', () => {
  it('ships empty: no model is ever shown for a car we have no real asset for', () => {
    expect(Object.keys(VEHICLE_MODELS)).toHaveLength(0);
    expect(resolveModel(swift)).toBeNull();
  });

  it('matches exact brand + model regardless of spacing/case, and never a "similar" car', () => {
    expect(modelKey(swift)).toBe('marutisuzuki:swift');
    const registry = { 'marutisuzuki:swift': { asset: 1 } };
    expect(resolveModel({ brand: 'MARUTI  suzuki', model: 'swift' }, registry)).toEqual({ asset: 1 });
    expect(resolveModel({ brand: 'Maruti Suzuki', model: 'Swift Dzire' }, registry)).toBeNull();
    expect(resolveModel({ brand: 'Hyundai', model: 'i20' }, registry)).toBeNull();
  });
});

describe('render quality', () => {
  it('gives low-end Android, and the web build, the lightweight fallback', () => {
    expect(renderQualityFor({ os: 'android', totalMemory: 2 * GB })).toBe('low');
    expect(renderQualityFor({ os: 'web' })).toBe('low');
  });
  it('allows 3D on capable Android and on iOS', () => {
    expect(renderQualityFor({ os: 'android', totalMemory: 6 * GB })).toBe('high');
    expect(renderQualityFor({ os: 'android', totalMemory: null })).toBe('high');
    expect(renderQualityFor({ os: 'ios', totalMemory: null })).toBe('high');
  });
});

describe('VehicleViewer', () => {
  it('shows the fallback hero, labelled honestly, when the vehicle has no 3D model', () => {
    render(<VehicleViewer vehicle={swift} />);
    expect(screen.getByTestId('vehicle-hero')).toBeTruthy();
    expect(screen.getByText('UP16AB1234')).toBeTruthy();
    expect(screen.getByText('3D view not available for this model yet')).toBeTruthy();
  });

  it('keeps the fallback on low-end devices even when a model exists', () => {
    render(<VehicleViewer vehicle={swift} model={{ asset: 1 }} quality="low" />);
    expect(screen.getByTestId('vehicle-hero')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-3d')).toBeNull();
  });

  it('describes the vehicle to screen readers', () => {
    render(<VehicleHero vehicle={swift} />);
    expect(screen.getByLabelText(/Swift.*UP16AB1234/)).toBeTruthy();
  });
});

describe('TurntableState', () => {
  it('turns with the finger and wraps within one revolution', () => {
    const t = new TurntableState();
    t.begin();
    t.drag(100, 1 / 60);
    expect(t.angle).toBeCloseTo(100 * 0.0085, 5);
    t.drag(-200, 1 / 60);
    expect(t.angle).toBeGreaterThan(0);
    expect(t.angle).toBeLessThan(Math.PI * 2);
  });

  it('coasts after a flick and comes to rest', () => {
    const t = new TurntableState({ autoRotate: false });
    t.begin();
    t.drag(80, 1 / 60);
    t.end();
    const afterRelease = t.angle;
    for (let i = 0; i < 20; i++) t.tick(1 / 60);
    expect(t.angle).not.toBe(afterRelease);
    for (let i = 0; i < 600; i++) t.tick(1 / 60);
    const rest = t.angle;
    t.tick(1 / 60);
    expect(t.angle).toBe(rest);
  });

  it('drifts slowly when idle, but not when auto-rotate is off (reduced motion)', () => {
    const idle = new TurntableState();
    for (let i = 0; i < 180; i++) idle.tick(1 / 60);
    expect(idle.angle).toBeGreaterThan(0);

    const still = new TurntableState({ autoRotate: false });
    for (let i = 0; i < 180; i++) still.tick(1 / 60);
    expect(still.angle).toBe(0);
  });

  it('does not move while being held', () => {
    const t = new TurntableState();
    t.begin();
    t.tick(5);
    expect(t.angle).toBe(0);
  });
});
