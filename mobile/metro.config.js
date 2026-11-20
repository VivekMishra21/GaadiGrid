const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 3D vehicle models are bundled as assets (see src/features/garage/vehicleModels.js).
config.resolver.assetExts.push('glb', 'gltf', 'bin');

module.exports = config;
