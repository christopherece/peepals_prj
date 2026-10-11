import type { Coords, Review, Toilet } from './types';

/** Great-circle distance in meters. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number | null): string {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Rough walking time at ~80 m/min. */
export function formatWalk(meters: number | null): string {
  if (meters == null) return '';
  return `${Math.max(1, Math.round(meters / 80))} min walk`;
}

export function feeLabel(t: Toilet): string {
  if (t.fee === true) return 'Paid';
  if (t.fee === false) return 'Free';
  return 'Cost unknown';
}

export function accessLabel(t: Toilet): string {
  if (t.access === 'customers') return 'Customers only';
  if (t.access === 'public') return 'Public';
  return 'Access unknown';
}

export function openLabel(open: boolean | null): string {
  if (open === true) return 'Open now';
  if (open === false) return 'Closed now';
  return 'Hours unknown';
}

export function yesNoLabel(value: boolean | null): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Unknown';
}

export function ratingSummary(reviews: Review[]): { average: number; count: number } | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, r) => sum + (r.cleanliness + r.safety + r.wait) / 3, 0);
  return { average: total / reviews.length, count: reviews.length };
}
