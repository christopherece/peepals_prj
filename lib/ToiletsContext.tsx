import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { backend } from './backend';
import { distanceMeters, formatAgo } from './format';
import { isOpenNow } from './openingHours';
import { fetchNearbyToilets } from './osm';
import { loadToiletCache, saveToiletCache } from './toiletCache';
import {
  NO_FILTERS,
  type Coords,
  type Filters,
  type NearbyToilet,
  type NewReview,
  type NewToilet,
  type Profile,
  type ReportTarget,
  type Review,
  type SignInMethod,
  type SocialProvider,
  type Toilet,
} from './types';

const SEARCH_RADIUS_METERS = 2000;
/** Content this device's user reported, hidden for them from then on. */
const HIDDEN_KEY = 'peepals:hidden';

export const hiddenKey = (target: ReportTarget) => `${target.kind}:${target.id}`;

type Status = 'locating' | 'loading' | 'ready' | 'error';

type ToiletsContextValue = {
  location: Coords | null;
  status: Status;
  error: string | null;
  /** true when location was refused and only the system Settings app can turn it back on. */
  needsSettings: boolean;
  /** Set when the list on screen is a saved copy because fresh data couldn't be loaded. */
  notice: string | null;
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
  /** Google / Facebook / Apple buttons to show on the sign-in sheet (empty offline). */
  socialProviders: SocialProvider[];
  /** Resolves true once signed in, false if the user backed out of the provider's screen. */
  signInWith: (provider: SocialProvider) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** These throw for guests; gate the UI with `useRequireMember` first. */
  addReview: (review: NewReview) => Promise<void>;
  addToilet: (toilet: NewToilet) => Promise<Toilet>;
  updateNickname: (nickname: string) => Promise<void>;
  /** Permanently deletes the member's account and everything they posted, then signs out. */
  deleteAccount: () => Promise<void>;
  /** Flags a review, photo or toilet for moderation and hides it on this device. */
  reportContent: (target: ReportTarget, reason: string) => Promise<void>;
  /** `hiddenKey(target)` of everything this user reported; `reviews` and `allNearby` already leave these out. */
  hidden: ReadonlySet<string>;
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
  const [needsSettings, setNeedsSettings] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [osmToilets, setOsmToilets] = useState<Toilet[]>([]);
  const [userToilets, setUserToilets] = useState<Toilet[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY).then(
      (raw) => raw && setHidden(new Set(JSON.parse(raw) as string[])),
      (e) => console.warn(e)
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('locating');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setNeedsSettings(permission.status !== 'granted' && !permission.canAskAgain);
      if (permission.status !== 'granted') {
        throw new Error(
          permission.canAskAgain
            ? 'Peepals needs your location to find toilets near you.'
            : 'Location is off for Peepals. Turn it on in Settings to see toilets near you.'
        );
      }
      const position = await getPosition();
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setLocation(coords);

      setStatus('loading');
      // OSM is the main source; user-added toilets are a bonus, so their failure isn't fatal.
      const [fresh, added] = await Promise.all([
        fetchNearbyToilets(coords, SEARCH_RADIUS_METERS).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e)))),
        backend.fetchUserToilets(coords, SEARCH_RADIUS_METERS).catch((e) => {
          console.warn(e);
          return [];
        }),
      ]);

      let osm: Toilet[];
      if (fresh instanceof Error) {
        // The data servers are down: fall back to what we loaded here last time, if anything.
        const cached = await loadToiletCache(coords);
        if (!cached && added.length === 0) throw fresh;
        osm = cached?.toilets ?? [];
        setNotice(
          cached
            ? `Couldn't refresh, so these are from ${formatAgo(cached.savedAt)}. Hours and details may have changed.`
            : "Couldn't load the public toilet map, so only toilets added by Peepals are shown."
        );
      } else {
        osm = fresh;
        setNotice(null);
        saveToiletCache(coords, fresh);
      }
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
      .filter((t) => !hidden.has(hiddenKey({ kind: 'toilet', id: t.id })))
      .map((t) => ({ ...t, distance: location ? distanceMeters(location, t) : null }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [userToilets, osmToilets, location, hidden]);

  const visibleReviews = useMemo(
    () => reviews.filter((r) => !hidden.has(hiddenKey({ kind: 'review', id: r.id }))),
    [reviews, hidden]
  );

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

  const signInWith = useCallback(async (provider: SocialProvider) => {
    const member = await backend.signInWithProvider(provider);
    if (member) setProfile(member);
    return member !== null;
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

  const deleteAccount = useCallback(async () => {
    const member = await requireProfile();
    await backend.deleteAccount(member);
    setProfile(null);
    // Their reviews and toilets are gone from the backend; drop them from the screen too.
    setReviews((prev) => prev.filter((r) => r.userId !== member.id));
    if (location) {
      setUserToilets(
        await backend.fetchUserToilets(location, SEARCH_RADIUS_METERS).catch((e) => {
          console.warn(e);
          return [];
        })
      );
    }
  }, [requireProfile, location]);

  const reportContent = useCallback(
    async (target: ReportTarget, reason: string) => {
      await backend.report(await requireProfile(), target, reason);
      const next = new Set(hidden).add(hiddenKey(target));
      setHidden(next);
      await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])).catch((e) => console.warn(e));
    },
    [requireProfile, hidden]
  );

  const value = useMemo(
    () => ({
      location,
      status,
      error,
      needsSettings,
      notice,
      allNearby,
      visible,
      reviews: visibleReviews,
      filters,
      setFilters,
      refresh,
      profile,
      authReady,
      shared: backend.shared,
      sendEmailCode: backend.sendEmailCode,
      signIn,
      socialProviders: backend.socialProviders,
      signInWith,
      signOut,
      addReview,
      addToilet,
      updateNickname,
      deleteAccount,
      reportContent,
      hidden,
    }),
    [
      location,
      status,
      error,
      needsSettings,
      notice,
      allNearby,
      visible,
      visibleReviews,
      filters,
      refresh,
      profile,
      authReady,
      signIn,
      signInWith,
      signOut,
      addReview,
      addToilet,
      updateNickname,
      deleteAccount,
      reportContent,
      hidden,
    ]
  );

  return <ToiletsContext.Provider value={value}>{children}</ToiletsContext.Provider>;
}

export function useToilets(): ToiletsContextValue {
  const ctx = useContext(ToiletsContext);
  if (!ctx) throw new Error('useToilets must be used inside <ToiletsProvider>');
  return ctx;
}
