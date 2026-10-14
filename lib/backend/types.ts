import type { Coords, NewReview, NewToilet, Photo, PickedPhoto, Profile, Review, SignInMethod, Toilet } from '../types';

/**
 * Where reviews, user-added toilets, photos and accounts are stored.
 * Reading is open to guests; every write takes the signed-in member's `Profile`.
 */
export type Backend = {
  /** true when data is shared with other users (Supabase); false for on-device only. */
  shared: boolean;

  /** The signed-in member, or null for a guest. */
  getMember(): Promise<Profile | null>;
  /** Called when the member signs in or out elsewhere (e.g. session expiry). Returns an unsubscribe. */
  onMemberChange(listener: () => void): () => void;
  /** Emails a 6-digit sign-in code (shared backend only; offline mode signs in with `device`). */
  sendEmailCode(email: string): Promise<void>;
  signIn(method: SignInMethod): Promise<Profile>;
  signOut(): Promise<void>;
  updateNickname(profile: Profile, nickname: string): Promise<Profile>;

  fetchReviews(toiletIds: string[]): Promise<Review[]>;
  /** Creates or replaces the user's review for that toilet. */
  saveReview(profile: Profile, review: NewReview): Promise<Review>;
  fetchUserToilets(center: Coords, radiusMeters: number): Promise<Toilet[]>;
  addToilet(profile: Profile, toilet: NewToilet): Promise<Toilet>;
  /** Newest first. */
  fetchPhotos(toiletId: string): Promise<Photo[]>;
  addPhoto(profile: Profile, toiletId: string, photo: PickedPhoto): Promise<Photo>;
};
