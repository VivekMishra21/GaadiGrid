import { calculateDetourWorth } from '../utils/detourCalculator';

describe('calculateDetourWorth', () => {
  it('says worth it when the cheaper station saves more than the detour costs', () => {
    // Nearby 100/L, detour 95/L, 2km extra one-way (4km round trip), 15 km/L mileage, filling 40L.
    // Extra fuel: 4/15 = 0.2667L * 100 = 26.67 extra cost.
    // Savings: 5 * 40 = 200. Net: 200 - 26.67 = 173.33 -> worth it.
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 95,
      extraDistanceKm: 2,
      mileageKmPerUnit: 15,
      fillUnits: 40,
    });

    expect(result.valid).toBe(true);
    expect(result.worthIt).toBe(true);
    expect(result.netSavings).toBeCloseTo(173.33, 1);
  });

  it('says not worth it when the detour is too far for the savings', () => {
    // Small price gap, large detour distance, small fill amount.
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 99,
      extraDistanceKm: 20,
      mileageKmPerUnit: 15,
      fillUnits: 5,
    });

    expect(result.worthIt).toBe(false);
    expect(result.netSavings).toBeLessThan(0);
  });

  it('says not worth it when the detour station is more expensive', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 95,
      detourPrice: 100,
      extraDistanceKm: 1,
      mileageKmPerUnit: 15,
      fillUnits: 40,
    });

    expect(result.worthIt).toBe(false);
    expect(result.netSavings).toBeLessThan(0);
    expect(result.breakEvenFillUnits).toBeNull();
  });

  it('is always worth it when there is savings and zero extra distance', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 99,
      extraDistanceKm: 0,
      mileageKmPerUnit: 15,
      fillUnits: 10,
    });

    expect(result.worthIt).toBe(true);
    expect(result.extraFuelCost).toBe(0);
    expect(result.netSavings).toBe(10);
  });

  it('computes a break-even fill amount that produces zero net savings', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 95,
      extraDistanceKm: 5,
      mileageKmPerUnit: 15,
      fillUnits: 40,
    });

    const atBreakEven = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 95,
      extraDistanceKm: 5,
      mileageKmPerUnit: 15,
      fillUnits: result.breakEvenFillUnits,
    });

    expect(atBreakEven.netSavings).toBeCloseTo(0, 0);
  });

  it('produces identical output for identical input (deterministic)', () => {
    const input = { nearbyPrice: 96.72, detourPrice: 89.3, extraDistanceKm: 3.4, mileageKmPerUnit: 18.5, fillUnits: 30 };
    expect(calculateDetourWorth(input)).toEqual(calculateDetourWorth(input));
  });

  it('rejects a non-positive nearby price', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 0,
      detourPrice: 95,
      extraDistanceKm: 2,
      mileageKmPerUnit: 15,
      fillUnits: 40,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.nearbyPrice).toBeTruthy();
  });

  it('rejects a non-positive detour price', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: -5,
      extraDistanceKm: 2,
      mileageKmPerUnit: 15,
      fillUnits: 40,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.detourPrice).toBeTruthy();
  });

  it('rejects a negative extra distance', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 95,
      extraDistanceKm: -1,
      mileageKmPerUnit: 15,
      fillUnits: 40,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.extraDistanceKm).toBeTruthy();
  });

  it('rejects zero or negative mileage', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 95,
      extraDistanceKm: 2,
      mileageKmPerUnit: 0,
      fillUnits: 40,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.mileageKmPerUnit).toBeTruthy();
  });

  it('rejects zero or negative fill amount', () => {
    const result = calculateDetourWorth({
      nearbyPrice: 100,
      detourPrice: 95,
      extraDistanceKm: 2,
      mileageKmPerUnit: 15,
      fillUnits: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.fillUnits).toBeTruthy();
  });

  it('reports multiple field errors at once', () => {
    const result = calculateDetourWorth({
      nearbyPrice: -1,
      detourPrice: -1,
      extraDistanceKm: -1,
      mileageKmPerUnit: -1,
      fillUnits: -1,
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors)).toHaveLength(5);
  });
});
