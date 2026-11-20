/* eslint-disable react/no-unknown-property -- react-three-fiber elements take three.js props (position, intensity, args…) */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { TurntableState } from '../../features/garage/turntable';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const TARGET_SIZE = 4; // every model is scaled so its longest side is this many scene units

// Resolve the bundled GLB to a file URI the loader can read.
function useAssetUri(asset) {
  const [uri, setUri] = useState(null);
  useEffect(() => {
    let alive = true;
    const a = Asset.fromModule(asset);
    a.downloadAsync()
      .then(() => alive && setUri(a.localUri || a.uri))
      .catch(() => alive && setUri(undefined));
    return () => {
      alive = false;
    };
  }, [asset]);
  return uri;
}

function Car({ uri, turntable }) {
  const group = useRef();
  const gltf = useLoader(GLTFLoader, uri);

  // Centre the model on the stage and scale it to a consistent size, whatever its source units.
  const { scene, scale, offset } = useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const s = TARGET_SIZE / Math.max(size.x, size.y, size.z || 1);
    return { scene: root, scale: s, offset: [-centre.x * s, -box.min.y * s, -centre.z * s] };
  }, [gltf]);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y = turntable.tick(Math.min(dt, 0.05));
  });

  useEffect(
    () => () => {
      // free GPU memory when the garage is left
      scene.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          Object.values(m || {}).forEach((v) => v?.isTexture && v.dispose());
          m?.dispose?.();
        });
      });
    },
    [scene]
  );

  return (
    <group ref={group} position={[0, -0.9, 0]}>
      <group position={offset} scale={scale}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/**
 * Live 3D view of a registered GLB model with drag-to-rotate and coasting. Native only: the web
 * build and low-end devices use the fallback hero instead (see VehicleViewer).
 */
export default function VehicleViewer3D({ asset, height = 260 }) {
  const reduced = useReducedMotion();
  const uri = useAssetUri(asset);
  const turntable = useMemo(() => new TurntableState({ autoRotate: !reduced }), [reduced]);

  const last = useRef({ x: 0, t: 0 });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
        onPanResponderGrant: (e) => {
          last.current = { x: e.nativeEvent.pageX, t: Date.now() };
          turntable.begin();
        },
        onPanResponderMove: (e) => {
          const now = Date.now();
          const x = e.nativeEvent.pageX;
          turntable.drag(x - last.current.x, Math.max((now - last.current.t) / 1000, 1 / 120));
          last.current = { x, t: now };
        },
        onPanResponderRelease: () => turntable.end(),
        onPanResponderTerminate: () => turntable.end(),
      }),
    [turntable]
  );

  if (uri === undefined) throw new Error('3D model asset could not be loaded');
  if (uri === null) return <View style={{ height }} />;

  return (
    <View style={[styles.frame, { height }]} {...pan.panHandlers} testID="vehicle-3d">
      <Canvas camera={{ position: [0, 1.4, 6.5], fov: 34 }} dpr={[1, 2]} gl={{ antialias: true }} style={styles.canvas} frameloop="always">
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} />
        <directionalLight position={[-5, 3, -4]} intensity={0.8} />
        <Suspense fallback={null}>
          <Car uri={uri} turntable={turntable} />
        </Suspense>
        {/* soft contact shadow under the car */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
          <circleGeometry args={[2.8, 48]} />
          <meshBasicMaterial color="#11181A" transparent opacity={0.1} />
        </mesh>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: '#EEF3F1', borderRadius: 18, overflow: 'hidden' },
  canvas: { flex: 1 },
});
