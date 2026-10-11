import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { distanceMeters } from './format';
import { isOpenNow } from './openingHours';
import { fetchNearbyToilets } from './osm';
import { loadReviews, loadUserToilets, newId, saveReviews, saveUserToilets } from './storage';
import { NO_FILTERS, type Coords, type Filters, type NearbyToilet, type Review, type Toilet } from './types';

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
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<void>;
  addToilet: (toilet: Omit<Toilet, 'id' | 'source'>) => Promise<Toilet>;
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
      setOsmToilets(await fetchNearbyToilets(coords));
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
    loadReviews().then(setReviews);
    loadUserToilets().then(setUserToilets);
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

  const addReview = useCallback(
    async (review: Omit<Review, 'id' | 'createdAt'>) => {
      const next = [{ ...review, id: newId('review'), createdAt: Date.now() }, ...reviews];
      setReviews(next);
      await saveReviews(next);
    },
    [reviews]
  );

  const addToilet = useCallback(
    async (toilet: Omit<Toilet, 'id' | 'source'>) => {
      const created: Toilet = { ...toilet, id: newId('user'), source: 'user' };
      const next = [created, ...userToilets];
      setUserToilets(next);
      await saveUserToilets(next);
      return created;
    },
    [userToilets]
  );

  const value = useMemo(
    () => ({ location, status, error, allNearby, visible, reviews, filters, setFilters, refresh, addReview, addToilet }),
    [location, status, error, allNearby, visible, reviews, filters, refresh, addReview, addToilet]
  );

  return <ToiletsContext.Provider value={value}>{children}</ToiletsContext.Provider>;
}

export function useToilets(): ToiletsContextValue {
  const ctx = useContext(ToiletsContext);
  if (!ctx) throw new Error('useToilets must be used inside <ToiletsProvider>');
  return ctx;
}
