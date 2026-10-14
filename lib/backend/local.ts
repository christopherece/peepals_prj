import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import type { Photo, Profile, Review, Toilet } from '../types';
import type { Backend } from './types';

// Offline fallback used when Supabase isn't configured: everything stays on this device.
// There are no real accounts: "signing in" creates a device profile with a nickname.
const REVIEWS_KEY = 'peepals:reviews';
const USER_TOILETS_KEY = 'peepals:userToilets';
const PHOTOS_KEY = 'peepals:photos';
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

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const localBackend: Backend = {
  shared: false,

  async getMember() {
    const profile = await read<Profile | null>(PROFILE_KEY, null);
    // Profiles saved by older versions have no email.
    return profile && { ...profile, email: profile.email ?? null };
  },

  onMemberChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async sendEmailCode() {
    throw new Error('Email sign-in needs the shared backend.');
  },

  async signIn(method) {
    if (method.kind !== 'device') throw new Error('Only device profiles are available in offline mode.');
    const profile: Profile = { id: LOCAL_USER_ID, nickname: method.nickname, email: method.email };
    await write(PROFILE_KEY, profile);
    notify();
    return profile;
  },

  async signOut() {
    // Keeps reviews, toilets and photos; they come back if the user signs in again.
    await AsyncStorage.removeItem(PROFILE_KEY);
    notify();
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

  async fetchUserToilets() {
    return read<Toilet[]>(USER_TOILETS_KEY, []);
  },

  async addToilet(_profile, toilet) {
    const created: Toilet = { ...toilet, id: newId('user'), source: 'user' };
    const all = await read<Toilet[]>(USER_TOILETS_KEY, []);
    await write(USER_TOILETS_KEY, [created, ...all]);
    return created;
  },

  async fetchPhotos(toiletId) {
    const all = await read<Photo[]>(PHOTOS_KEY, []);
    return all.filter((p) => p.toiletId === toiletId);
  },

  async addPhoto(profile, toiletId, picked) {
    // Picker results live in a cache folder the OS may clear, so keep our own copy.
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ intermediates: true });
    const id = newId('photo');
    const destination = new File(dir, `${id}.${picked.mimeType === 'image/png' ? 'png' : 'jpg'}`);
    await new File(picked.uri).copy(destination);

    const photo: Photo = { id, toiletId, userId: profile.id, url: destination.uri, createdAt: Date.now() };
    const all = await read<Photo[]>(PHOTOS_KEY, []);
    await write(PHOTOS_KEY, [photo, ...all]);
    return photo;
  },
};
