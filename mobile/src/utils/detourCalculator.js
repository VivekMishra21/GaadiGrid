function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Pure, deterministic "worth the detour?" calculation. Compares the price
 * savings from filling up at a cheaper-but-farther station against the extra
 * fuel burned driving the round trip to get there.
 *
 * @param {object} input
 * @param {number} input.nearbyPrice - price per unit at your current/nearby station
 * @param {number} input.detourPrice - price per unit at the farther station
 * @param {number} input.extraDistanceKm - extra one-way distance to the detour station
 * @param {number} input.mileageKmPerUnit - vehicle's distance per fuel unit (km/litre, km/kg, km/kWh)
 * @param {number} input.fillUnits - how many units you plan to buy at the detour station
 */
export function calculateDetourWorth({ nearbyPrice, detourPrice, extraDistanceKm, mileageKmPerUnit, fillUnits }) {
  const errors = {};
  if (!(nearbyPrice > 0)) errors.nearbyPrice = 'Enter a valid price greater than 0.';
  if (!(detourPrice > 0)) errors.detourPrice = 'Enter a valid price greater than 0.';
  if (!(extraDistanceKm >= 0)) errors.extraDistanceKm = 'Distance cannot be negative.';
  if (!(mileageKmPerUnit > 0)) errors.mileageKmPerUnit = 'Enter a valid mileage greater than 0.';
  if (!(fillUnits > 0)) errors.fillUnits = 'Enter a fill amount greater than 0.';

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  // Round trip: you drive the extra distance there AND back.
  const extraFuelUnits = (extraDistanceKm * 2) / mileageKmPerUnit;
  const extraFuelCost = extraFuelUnits * nearbyPrice;

  const pricePerUnitSavings = nearbyPrice - detourPrice;
  const totalSavingsOnFill = pricePerUnitSavings * fillUnits;
  const netSavings = totalSavingsOnFill - extraFuelCost;

  const breakEvenFillUnits = pricePerUnitSavings > 0 ? extraFuelCost / pricePerUnitSavings : null;

  return {
    valid: true,
    extraFuelUnits: round2(extraFuelUnits),
    extraFuelCost: round2(extraFuelCost),
    totalSavingsOnFill: round2(totalSavingsOnFill),
    netSavings: round2(netSavings),
    worthIt: netSavings > 0,
    breakEvenFillUnits: breakEvenFillUnits !== null ? round2(breakEvenFillUnits) : null,
  };
}
