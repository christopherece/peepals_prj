import type { Coords, NewReview, NewToilet, Profile, Review, Toilet } from '../types';

/** Where reviews, user-added toilets and the profile are stored. */
export type Backend = {
  /** true when data is shared with other users (Supabase); false for on-device only. */
  shared: boolean;
  /** Signs the user in (anonymously if needed) and returns their profile. */
  signIn(): Promise<Profile>;
  updateNickname(profile: Profile, nickname: string): Promise<Profile>;
  fetchReviews(toiletIds: string[]): Promise<Review[]>;
  /** Creates or replaces the user's review for that toilet. */
  saveReview(profile: Profile, review: NewReview): Promise<Review>;
  fetchUserToilets(center: Coords, radiusMeters: number): Promise<Toilet[]>;
  addToilet(profile: Profile, toilet: NewToilet): Promise<Toilet>;
};
