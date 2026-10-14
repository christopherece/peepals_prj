export type Coords = {
  latitude: number;
  longitude: number;
};

/** `public` = anyone can use it; `customers` = you need to buy something first. */
export type Access = 'public' | 'customers' | 'unknown';

export type Toilet = Coords & {
  id: string;
  name: string;
  /** true = paid, false = free, null = unknown */
  fee: boolean | null;
  access: Access;
  wheelchair: boolean | null;
  changingTable: boolean | null;
  genderNeutral: boolean | null;
  /** Raw OpenStreetMap `opening_hours` value, e.g. "Mo-Fr 08:00-18:00" or "24/7". */
  openingHours: string | null;
  source: 'osm' | 'user';
};

export type NearbyToilet = Toilet & {
  /** Meters from the user, or null when the user's location is unknown. */
  distance: number | null;
};

/** A signed-in community member. Guests have no profile. */
export type Profile = {
  id: string;
  nickname: string;
  email: string | null;
};

/**
 * How a guest becomes a member: always by email. With Supabase the address is verified with a
 * 6-digit code; in offline mode (`device`) nothing can be sent, so the profile just lives on this phone.
 */
export type SignInMethod =
  { kind: 'email-code'; email: string; code: string } | { kind: 'device'; email: string; nickname: string };

export type Photo = {
  id: string;
  toiletId: string;
  userId: string;
  /** Displayable URL (public storage URL, or a file:// URI in offline mode). */
  url: string;
  createdAt: number;
};

/** A photo picked from the camera or library, not uploaded yet. */
export type PickedPhoto = {
  uri: string;
  mimeType: string;
};

export type Review = {
  id: string;
  toiletId: string;
  userId: string;
  /** Nickname of the reviewer */
  author: string;
  /** 1–5 for each */
  cleanliness: number;
  safety: number;
  /** 5 = no wait at all */
  wait: number;
  comment: string;
  createdAt: number;
};

export type NewReview = Pick<Review, 'toiletId' | 'cleanliness' | 'safety' | 'wait' | 'comment'>;

export type NewToilet = Omit<Toilet, 'id' | 'source'>;

export type Filters = {
  free: boolean;
  openNow: boolean;
  accessible: boolean;
  changingTable: boolean;
  genderNeutral: boolean;
};

export const NO_FILTERS: Filters = {
  free: false,
  openNow: false,
  accessible: false,
  changingTable: false,
  genderNeutral: false,
};
