/**
 * Registry of real 3D models (GLB) for specific vehicles, keyed by "brand:model".
 *
 * It is deliberately EMPTY. GaadiGrid never shows a model that is not the user's actual vehicle
 * (see the product rules): a vehicle without an entry gets the fallback hero instead. To add one:
 *
 *   1. Put a licensed, optimised GLB (aim for < 3 MB, textures ≤ 1024px) in assets/models3d/.
 *   2. Register it here, e.g.
 *        'marutisuzuki:swift': { asset: require('../../../assets/models3d/maruti-swift.glb'), license: 'CC-BY 4.0, <author>' },
 *   3. Test on a real Android and iOS device (see docs/MOBILE_AUDIT.md).
 */
export const VEHICLE_MODELS = {};

const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const modelKey = (vehicle) => `${normalise(vehicle?.brand)}:${normalise(vehicle?.model)}`;

/** The registered 3D model for this exact brand + model, or null. Never guesses a "similar" car. */
export function resolveModel(vehicle, registry = VEHICLE_MODELS) {
  if (!vehicle) return null;
  return registry[modelKey(vehicle)] || null;
}
