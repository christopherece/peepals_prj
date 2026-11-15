import AsyncStorage from '@react-native-async-storage/async-storage';

import { distanceMeters } from './format';
import type { Coords, Toilet } from './types';

// The last successful OpenStreetMap load, kept so the map isn't empty when the data servers are down.
const CACHE_KEY = 'peepals:osmCache';
/** A saved load is reused only if the user is still about where they were when it was made. */
const MAX_DRIFT_METERS = 1000;

type Cached = { center: Coords; savedAt: number; toilets: Toilet[] };

export async function saveToiletCache(center: Coords, toilets: Toilet[]): Promise<void> {
  const value: Cached = { center, savedAt: Date.now(), toilets };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(value)).catch((e) => console.warn(e));
}

/** The saved toilets if they were loaded near `center`, else null. */
export async function loadToiletCache(center: Coords): Promise<{ toilets: Toilet[]; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Cached;
    if (distanceMeters(center, cached.center) > MAX_DRIFT_METERS) return null;
    return { toilets: cached.toilets, savedAt: cached.savedAt };
  } catch (e) {
    console.warn(e);
    return null;
  }
}
