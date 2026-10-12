import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
// A fresh GPS fix can take forever indoors; after this long, settle for an older one.
const LOCATE_TIMEOUT_MS = 15_000;

/** A recent cached position if there is one, else a fresh fix, else (after a timeout) any cached position. */
async function locate(): Promise<Location.LocationObject> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  if (recent) return recent;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), LOCATE_TIMEOUT_MS);
  });
  try {
    const fresh = await Promise.race([Location.getCurrentPositionAsync(), timeout]);
    if (fresh) return fresh;
  } finally {
    clearTimeout(timer);
  }
  const old = await Location.getLastKnownPositionAsync();
  if (old) return old;
  throw new Error("Couldn't find your location. Check that location is turned on, then try again.");
}

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
  /** `reviews` grouped by toilet id, newest first. */
  reviewsByToilet: Map<string, Review[]>;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  refresh: () => Promise<void>;
  /** null until sign-in finishes (or if it failed). */
  profile: Profile | null;
  /** true when reviews are shared with everyone, false when they stay on this device. */
  shared: boolean;
  addReview: (review: NewReview) => Promise<void>;
  deleteReview: (toiletId: string) => Promise<void>;
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
  // Bumped on every refresh so a slow, older refresh can't overwrite a newer one.
  const refreshId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    const isStale = () => id !== refreshId.current;
    setError(null);
    setStatus('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Peepals needs your location to find toilets near you.');
      }
      const position = await locate();
      if (isStale()) return;
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
      if (isStale()) return;
      setOsmToilets(osm);
      setUserToilets(added);
      setStatus('ready');

      const ids = [...added, ...osm].map((t) => t.id);
      const fetched = await backend.fetchReviews(ids).catch((e) => {
        console.warn(e);
        return [];
      });
      if (!isStale()) setReviews(fetched);
    } catch (e) {
      if (isStale()) return;
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

  const reviewsByToilet = useMemo(() => {
    const byToilet = new Map<string, Review[]>();
    for (const r of reviews) {
      const list = byToilet.get(r.toiletId);
      if (list) list.push(r);
      else byToilet.set(r.toiletId, [r]);
    }
    return byToilet;
  }, [reviews]);

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

  const deleteReview = useCallback(
    async (toiletId: string) => {
      const me = await requireProfile();
      await backend.deleteReview(me, toiletId);
      setReviews((prev) => prev.filter((r) => !(r.toiletId === toiletId && r.userId === me.id)));
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
      reviewsByToilet,
      filters,
      setFilters,
      refresh,
      profile,
      shared: backend.shared,
      addReview,
      deleteReview,
      addToilet,
      updateNickname,
    }),
    [
      location,
      status,
      error,
      allNearby,
      visible,
      reviews,
      reviewsByToilet,
      filters,
      refresh,
      profile,
      addReview,
      deleteReview,
      addToilet,
      updateNickname,
    ]
  );

  return <ToiletsContext.Provider value={value}>{children}</ToiletsContext.Provider>;
}

export function useToilets(): ToiletsContextValue {
  const ctx = useContext(ToiletsContext);
  if (!ctx) throw new Error('useToilets must be used inside <ToiletsProvider>');
  return ctx;
}
