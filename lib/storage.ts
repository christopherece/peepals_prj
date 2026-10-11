import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Review, Toilet } from './types';

// On-device storage for the MVP. Swap these four functions for Supabase calls
// once accounts exist, so reviews are shared between users.
const REVIEWS_KEY = 'peepals:reviews';
const USER_TOILETS_KEY = 'peepals:userToilets';

async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

export const loadReviews = () => readList<Review>(REVIEWS_KEY);
export const loadUserToilets = () => readList<Toilet>(USER_TOILETS_KEY);

export async function saveReviews(reviews: Review[]): Promise<void> {
  await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

export async function saveUserToilets(toilets: Toilet[]): Promise<void> {
  await AsyncStorage.setItem(USER_TOILETS_KEY, JSON.stringify(toilets));
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
