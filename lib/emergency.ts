import { isOpenNow } from './openingHours';
import type { NearbyToilet } from './types';

/**
 * Picks the best toilet for someone who needs one right now:
 * free, usable without buying anything, not known to be closed, and close.
 * Toilets with unknown hours are allowed but count as 50% farther away,
 * so a confirmed-open one wins unless it's much farther.
 */
export function findEmergencyToilet(toilets: NearbyToilet[], now = new Date()): NearbyToilet | null {
  let best: NearbyToilet | null = null;
  let bestScore = Infinity;

  for (const t of toilets) {
    if (t.distance == null) continue;
    if (t.fee === true || t.access === 'customers') continue;
    const open = isOpenNow(t.openingHours, now);
    if (open === false) continue;

    const score = t.distance * (open === true ? 1 : 1.5);
    if (score < bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}
