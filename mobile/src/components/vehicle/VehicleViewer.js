import { Component, lazy, Suspense } from 'react';
import { Platform } from 'react-native';

import { resolveModel } from '../../features/garage/vehicleModels';
import { useRenderQuality } from '../../hooks/useRenderQuality';
import { VehicleHero } from './VehicleHero';

// three.js and the GL bindings are only fetched when a real model needs them.
const Viewer3D = lazy(() => import('./VehicleViewer3D'));

class ViewerBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // A model that fails to load must never break the garage: quietly show the fallback.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The garage's vehicle visual. A live, rotatable 3D model is used only when this exact brand +
 * model has a registered GLB AND the device can handle it; in every other case (no model, low-end
 * Android, web, load error) the lightweight hero is shown. The hero is also what shows while a
 * model loads, so the garage is never blocked.
 */
export function VehicleViewer({ vehicle, model = resolveModel(vehicle), quality, width }) {
  const detected = useRenderQuality();
  const effective = quality || detected;

  const hero = <VehicleHero vehicle={vehicle} width={width} />;
  if (!model || effective === 'low' || Platform.OS === 'web') return hero;

  return (
    <ViewerBoundary fallback={hero}>
      <Suspense fallback={<VehicleHero vehicle={vehicle} width={width} loading />}>
        <Viewer3D asset={model.asset} />
      </Suspense>
    </ViewerBoundary>
  );
}
