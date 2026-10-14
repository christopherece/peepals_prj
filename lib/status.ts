import { isOpenNow } from './openingHours';
import type { Toilet } from './types';

/** success = open, warning = customers-only, danger = closed, neutral = hours unknown. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * The single status shown on map pins and badges. Closed wins over everything,
 * then customers-only (you can't just walk in), then open, then unknown.
 */
export function toiletStatus(t: Toilet, now = new Date()): { tone: StatusTone; label: string } {
  const open = isOpenNow(t.openingHours, now);
  if (open === false) return { tone: 'danger', label: 'Closed now' };
  if (t.access === 'customers') return { tone: 'warning', label: 'Customers only' };
  if (open === true) return { tone: 'success', label: 'Open now' };
  return { tone: 'neutral', label: 'Hours unknown' };
}
