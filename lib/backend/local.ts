import AsyncStorage from '@react-native-async-storage/async-storage';

import { distanceMeters } from '../format';
import type { Profile, Review, Toilet } from '../types';
import type { Backend } from './types';

// Offline fallback used when Supabase isn't configured: everything stays on this device.
const REVIEWS_KEY = 'peepals:reviews';
const USER_TOILETS_KEY = 'peepals:userToilets';
const PROFILE_KEY = 'peepals:profile';
const LOCAL_USER_ID = 'local-user';

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const localBackend: Backend = {
  shared: false,

  async signIn() {
    return read<Profile>(PROFILE_KEY, { id: LOCAL_USER_ID, nickname: 'You' });
  },

  async updateNickname(profile, nickname) {
    const updated = { ...profile, nickname };
    await write(PROFILE_KEY, updated);
    return updated;
  },

  async fetchReviews(toiletIds) {
    const ids = new Set(toiletIds);
    const all = await read<Review[]>(REVIEWS_KEY, []);
    return all.filter((r) => ids.has(r.toiletId));
  },

  async saveReview(profile, review) {
    const saved: Review = {
      ...review,
      id: newId('review'),
      userId: profile.id,
      author: profile.nickname,
      createdAt: Date.now(),
    };
    const all = await read<Review[]>(REVIEWS_KEY, []);
    const others = all.filter((r) => !(r.toiletId === review.toiletId && r.userId === profile.id));
    await write(REVIEWS_KEY, [saved, ...others]);
    return saved;
  },

  async deleteReview(profile, toiletId) {
    const all = await read<Review[]>(REVIEWS_KEY, []);
    await write(
      REVIEWS_KEY,
      all.filter((r) => !(r.toiletId === toiletId && r.userId === profile.id))
    );
  },

  async fetchUserToilets(center, radiusMeters) {
    const all = await read<Toilet[]>(USER_TOILETS_KEY, []);
    return all.filter((t) => distanceMeters(center, t) <= radiusMeters);
  },

  async addToilet(_profile, toilet) {
    const created: Toilet = { ...toilet, id: newId('user'), source: 'user' };
    const all = await read<Toilet[]>(USER_TOILETS_KEY, []);
    await write(USER_TOILETS_KEY, [created, ...all]);
    return created;
  },
};
