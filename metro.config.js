// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SVG files exported from Figma are imported as components (react-native-svg-transformer).
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];
// The Drizzle migrations are bundled as .sql files (drizzle/migrations.js, ADR-0010).
config.resolver.sourceExts.push('sql');

module.exports = config;
