import { isOpenNow } from './openingHours';
import type { NearbyToilet } from './types';

/** Extra walking counted for each floor a toilet is above or below street level. */
const METERS_PER_FLOOR = 25;

/**
 * Picks the best toilet for someone who needs one right now:
 * free, usable without buying anything, not known to be closed, and close.
 * Toilets with unknown hours are allowed but count as 50% farther away,
 * so a confirmed-open one wins unless it's much farther.
 * Each floor away from street level counts as extra walking, so a toilet at the top of
 * a tower next door doesn't beat one on the street a block away.
 */
export function findEmergencyToilet(toilets: NearbyToilet[], now = new Date()): NearbyToilet | null {
  let best: NearbyToilet | null = null;
  let bestScore = Infinity;

  for (const t of toilets) {
    if (t.distance == null) continue;
    if (t.fee === true || t.access === 'customers') continue;
    const open = isOpenNow(t.openingHours, now);
    if (open === false) continue;

    const effort = t.distance + Math.abs(t.level ?? 0) * METERS_PER_FLOOR;
    const score = effort * (open === true ? 1 : 1.5);
    if (score < bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}
