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

export type Review = {
  id: string;
  toiletId: string;
  /** 1–5 for each */
  cleanliness: number;
  safety: number;
  /** 5 = no wait at all */
  wait: number;
  comment: string;
  createdAt: number;
};

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
