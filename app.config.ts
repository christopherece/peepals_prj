import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withAndroidManifest, type ConfigPlugin } from 'expo/config-plugins';

/**
 * expo-location ships Android services for background location, which Peepals never uses (it only
 * reads location while the app is open). Google Play treats a declared location foreground service
 * as something you must justify with a demo video, so take them out of the merged manifest.
 */
const UNUSED_LOCATION_SERVICES = [
  'expo.modules.location.services.LocationTaskService',
  'expo.modules.location.next.locationForegroundService.LocationForegroundService',
];

const withoutBackgroundLocationServices: ConfigPlugin = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application?.[0];
    if (app) {
      const services = (app.service ?? []).filter((s) => !UNUSED_LOCATION_SERVICES.includes(s.$['android:name']));
      app.service = [
        ...services,
        ...UNUSED_LOCATION_SERVICES.map((name) => ({ $: { 'android:name': name, 'tools:node': 'remove' } })),
      ] as typeof app.service;
    }
    return mod;
  });

/**
 * Extends app.json with values that come from the environment (app.json can't read env vars).
 *
 * GOOGLE_MAPS_API_KEY: Android draws the map with Google Maps, which shows a blank grey map in
 * store and development builds without a key (Expo Go brings its own). iOS uses Apple Maps and
 * needs nothing. Set it as an EAS environment variable; see "Ship it" in the README.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  return withoutBackgroundLocationServices({
    ...config,
    name: config.name ?? 'Peepals',
    slug: config.slug ?? 'peepals',
    plugins: [
      ...(config.plugins ?? []),
      ...(googleMapsKey ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsKey }] as [string, object]] : []),
    ],
  });
};
