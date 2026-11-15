import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that come from the environment (app.json can't read env vars).
 *
 * GOOGLE_MAPS_API_KEY: Android draws the map with Google Maps, which shows a blank grey map in
 * store and development builds without a key (Expo Go brings its own). iOS uses Apple Maps and
 * needs nothing. Set it as an EAS environment variable; see "Ship it" in the README.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    name: config.name ?? 'Peepals',
    slug: config.slug ?? 'peepals',
    plugins: [
      ...(config.plugins ?? []),
      ...(googleMapsKey ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsKey }] as [string, object]] : []),
    ],
  };
};
