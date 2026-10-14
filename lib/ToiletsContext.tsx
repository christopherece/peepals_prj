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
  type SignInMethod,
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
  /** The signed-in member, or null for a guest. Guests can browse; contributing needs a profile. */
  profile: Profile | null;
  /** false until we know whether a member is signed in. */
  authReady: boolean;
  /** true when reviews are shared with everyone, false when they stay on this device. */
  shared: boolean;
  sendEmailCode: (email: string) => Promise<void>;
  signIn: (method: SignInMethod) => Promise<void>;
  signOut: () => Promise<void>;
  /** These throw for guests; gate the UI with `useRequireMember` first. */
  addReview: (review: NewReview) => Promise<void>;
  addToilet: (toilet: NewToilet) => Promise<Toilet>;
  updateNickname: (nickname: string) => Promise<void>;
};

const POSITION_TIMEOUT_MS = 15_000;

/** A recent fix if there is one, else a fresh one; falls back to an older fix rather than failing. */
async function getPosition(): Promise<Location.LocationObject> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  if (recent) return recent;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out finding your location.')), POSITION_TIMEOUT_MS)
      ),
    ]);
  } catch (e) {
    // Indoors or with GPS off, an older position still finds toilets nearby.
    const stale = await Location.getLastKnownPositionAsync();
    if (stale) return stale;
    console.warn(e);
    throw new Error("Couldn't find your location. Check that location is turned on, then try again.");
  }
}

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
  const [authReady, setAuthReady] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Peepals needs your location to find toilets near you.');
      }
      const position = await getPosition();
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
  }, [refresh]);

  useEffect(() => {
    const loadMember = () =>
      backend
        .getMember()
        .then(setProfile, (e) => console.warn(e))
        .finally(() => setAuthReady(true));
    loadMember();
    return backend.onMemberChange(loadMember);
  }, []);

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
    if (!profile) throw new Error('Sign in to join the Peepals community first.');
    return profile;
  }, [profile]);

  const signIn = useCallback(async (method: SignInMethod) => {
    setProfile(await backend.signIn(method));
  }, []);

  const signOut = useCallback(async () => {
    await backend.signOut();
    setProfile(null);
  }, []);

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
      authReady,
      shared: backend.shared,
      sendEmailCode: backend.sendEmailCode,
      signIn,
      signOut,
      addReview,
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
      filters,
      refresh,
      profile,
      authReady,
      signIn,
      signOut,
      addReview,
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
