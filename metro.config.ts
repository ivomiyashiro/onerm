// https://docs.expo.dev/guides/customizing-metro/
import { getDefaultConfig, type MetroConfig } from 'expo/metro-config';

// Typed as MetroConfig: Expo's own return type turns `transformer` into `never` (conflicting
// `enableBabelRCLookup` types in its intersection).
const config: MetroConfig = getDefaultConfig(__dirname);
const { transformer, resolver } = config;

export default {
  ...config,
  transformer: {
    ...transformer,
    // SVG files exported from Figma are imported as components (react-native-svg-transformer).
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
  },
  resolver: {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    // The Drizzle migrations are bundled as .sql files (drizzle/migrations.js, ADR-0010).
    sourceExts: [...resolver.sourceExts, 'svg', 'sql'],
  },
};
