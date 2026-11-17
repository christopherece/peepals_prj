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

/** Folder inside the app's documents directory where offline photos are kept. */
const PHOTO_DIR = 'photos';

/**
 * Photos are stored by file name, not full path: iOS moves the app's container on every update,
 * so an absolute file:// URI saved today points nowhere tomorrow.
 */
function photoFile(stored: string): File {
  return new File(Paths.document, PHOTO_DIR, stored.split('/').pop() ?? stored);
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

  socialProviders: [],

  async signInWithProvider() {
    throw new Error('Google, Facebook and Apple sign-in need the shared backend.');
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

  async deleteAccount(profile) {
    const photos = await read<Photo[]>(PHOTOS_KEY, []);
    for (const photo of photos) {
      const file = photoFile(photo.url);
      if (file.exists) file.delete();
    }
    const reviews = await read<Review[]>(REVIEWS_KEY, []);
    await write(
      REVIEWS_KEY,
      reviews.filter((r) => r.userId !== profile.id)
    );
    await AsyncStorage.multiRemove([PROFILE_KEY, USER_TOILETS_KEY, PHOTOS_KEY]);
    notify();
  },

  async report() {
    // Nothing to send in offline mode: the app hides reported content on this device.
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
    return all.filter((p) => p.toiletId === toiletId).map((p) => ({ ...p, url: photoFile(p.url).uri }));
  },

  async addPhoto(profile, toiletId, picked) {
    // Picker results live in a cache folder the OS may clear, so keep our own copy.
    const dir = new Directory(Paths.document, PHOTO_DIR);
    if (!dir.exists) dir.create({ intermediates: true });
    const id = newId('photo');
    const fileName = `${id}.${picked.mimeType === 'image/png' ? 'png' : 'jpg'}`;
    const destination = new File(dir, fileName);
    await new File(picked.uri).copy(destination);

    const photo: Photo = { id, toiletId, userId: profile.id, url: fileName, createdAt: Date.now() };
    const all = await read<Photo[]>(PHOTOS_KEY, []);
    await write(PHOTOS_KEY, [photo, ...all]);
    return { ...photo, url: destination.uri };
  },
};
