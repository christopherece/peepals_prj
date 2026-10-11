import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { backend } from './backend';
import { distanceMeters } from './format';
import { isOpenNow } from './openingHours';
import { fetchNearbyToilets } from './osm';
import {
  NO_FILTERS,
  type Coords,
  type Filters,
  type NearbyToilet,
  type NewReview,
  type NewToilet,
  type Profile,
  type Review,
  type Toilet,
} from './types';

const SEARCH_RADIUS_METERS = 2000;

type Status = 'locating' | 'loading' | 'ready' | 'error';

type ToiletsContextValue = {
  location: Coords | null;
  status: Status;
  error: string | null;
  /** Every known toilet, nearest first. Emergency mode uses this and ignores filters. */
  allNearby: NearbyToilet[];
  /** `allNearby` with the user's filters applied. */
  visible: NearbyToilet[];
  reviews: Review[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  refresh: () => Promise<void>;
  /** null until sign-in finishes (or if it failed). */
  profile: Profile | null;
  /** true when reviews are shared with everyone, false when they stay on this device. */
  shared: boolean;
  addReview: (review: NewReview) => Promise<void>;
  addToilet: (toilet: NewToilet) => Promise<Toilet>;
  updateNickname: (nickname: string) => Promise<void>;
};

const ToiletsContext = createContext<ToiletsContextValue | null>(null);

export function ToiletsProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Coords | null>(null);
  const [status, setStatus] = useState<Status>('locating');
  const [error, setError] = useState<string | null>(null);
  const [osmToilets, setOsmToilets] = useState<Toilet[]>([]);
  const [userToilets, setUserToilets] = useState<Toilet[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Peepals needs your location to find toilets near you.');
      }
      const position =
        (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
        (await Location.getCurrentPositionAsync());
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setLocation(coords);

      setStatus('loading');
      // OSM is the main source; user-added toilets are a bonus, so their failure isn't fatal.
      const [osm, added] = await Promise.all([
        fetchNearbyToilets(coords, SEARCH_RADIUS_METERS),
        backend.fetchUserToilets(coords, SEARCH_RADIUS_METERS).catch((e) => {
          console.warn(e);
          return [];
        }),
      ]);
      setOsmToilets(osm);
      setUserToilets(added);
      setStatus('ready');

      const ids = [...added, ...osm].map((t) => t.id);
      setReviews(
        await backend.fetchReviews(ids).catch((e) => {
          console.warn(e);
          return [];
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
    backend.signIn().then(setProfile, (e) => console.warn(e));
  }, [refresh]);

  const allNearby = useMemo<NearbyToilet[]>(() => {
    return [...userToilets, ...osmToilets]
      .map((t) => ({ ...t, distance: location ? distanceMeters(location, t) : null }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [userToilets, osmToilets, location]);

  const visible = useMemo(() => {
    const now = new Date();
    return allNearby.filter(
      (t) =>
        (!filters.free || t.fee === false) &&
        (!filters.openNow || isOpenNow(t.openingHours, now) === true) &&
        (!filters.accessible || t.wheelchair === true) &&
        (!filters.changingTable || t.changingTable === true) &&
        (!filters.genderNeutral || t.genderNeutral === true)
    );
  }, [allNearby, filters]);

  const requireProfile = useCallback(async () => {
    if (profile) return profile;
    // Sign-in may have failed at startup (e.g. offline); try again now.
    const signedIn = await backend.signIn();
    setProfile(signedIn);
    return signedIn;
  }, [profile]);

  const addReview = useCallback(
    async (review: NewReview) => {
      const saved = await backend.saveReview(await requireProfile(), review);
      // Posting again replaces your earlier review of the same toilet.
      setReviews((prev) => [
        saved,
        ...prev.filter((r) => !(r.toiletId === saved.toiletId && r.userId === saved.userId)),
      ]);
    },
    [requireProfile]
  );

  const addToilet = useCallback(
    async (toilet: NewToilet) => {
      const created = await backend.addToilet(await requireProfile(), toilet);
      setUserToilets((prev) => [created, ...prev]);
      return created;
    },
    [requireProfile]
  );

  const updateNickname = useCallback(
    async (nickname: string) => {
      const updated = await backend.updateNickname(await requireProfile(), nickname);
      setProfile(updated);
      // Show the new name on reviews already on screen.
      setReviews((prev) => prev.map((r) => (r.userId === updated.id ? { ...r, author: updated.nickname } : r)));
    },
    [requireProfile]
  );

  const value = useMemo(
    () => ({
      location,
      status,
      error,
      allNearby,
      visible,
      reviews,
      filters,
      setFilters,
      refresh,
      profile,
      shared: backend.shared,
      addReview,
      addToilet,
      updateNickname,
    }),
    [location, status, error, allNearby, visible, reviews, filters, refresh, profile, addReview, addToilet, updateNickname]
  );

  return <ToiletsContext.Provider value={value}>{children}</ToiletsContext.Provider>;
}

export function useToilets(): ToiletsContextValue {
  const ctx = useContext(ToiletsContext);
  if (!ctx) throw new Error('useToilets must be used inside <ToiletsProvider>');
  return ctx;
}
