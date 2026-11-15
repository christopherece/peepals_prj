import {
  distanceMeters,
  feeLabel,
  formatAgo,
  formatDistance,
  formatHours,
  formatWalk,
  ratingSummary,
  yesNoLabel,
} from '@/lib/format';
import { toiletStatus } from '@/lib/status';
import type { Review, Toilet } from '@/lib/types';

const base: Toilet = {
  id: 't',
  name: 't',
  latitude: 0,
  longitude: 0,
  fee: null,
  access: 'unknown',
  wheelchair: null,
  changingTable: null,
  genderNeutral: null,
  openingHours: null,
  source: 'osm',
};

describe('distances', () => {
  it('measures great-circle distance in meters', () => {
    // One degree of latitude is about 111 km.
    expect(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111_195, -2);
  });

  it('formats distances and walking time', () => {
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(234)).toBe('230 m');
    expect(formatDistance(1530)).toBe('1.5 km');
    expect(formatWalk(10)).toBe('1 min walk');
    expect(formatWalk(800)).toBe('10 min walk');
  });
});

describe('labels', () => {
  it('says "unknown" the same way for tri-state fields', () => {
    expect(feeLabel({ ...base, fee: true })).toBe('Paid');
    expect(feeLabel({ ...base, fee: false })).toBe('Free');
    expect(feeLabel(base)).toBe('Cost unknown');
    expect(yesNoLabel(null)).toBe('Unknown');
  });

  it('makes OSM hours readable', () => {
    expect(formatHours(null)).toBe('Unknown');
    expect(formatHours('24/7')).toBe('Open 24 hours');
    expect(formatHours('Mo-Su 06:00-20:00')).toBe('Every day 06:00–20:00');
    expect(formatHours('Mo-Fr 08:00-18:00; Sa off')).toBe('Mon–Fri 08:00–18:00\nSat closed');
  });

  it('formats how long ago', () => {
    const now = Date.UTC(2026, 10, 15, 12);
    expect(formatAgo(now - 20_000, now)).toBe('just now');
    expect(formatAgo(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(formatAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(formatAgo(now - 2 * 86_400_000, now)).toBe('2 d ago');
  });
});

describe('ratingSummary', () => {
  const review = (c: number, s: number, w: number): Review => ({
    id: `${c}${s}${w}`,
    toiletId: 't',
    userId: 'u',
    author: 'A Peepal',
    cleanliness: c,
    safety: s,
    wait: w,
    comment: '',
    createdAt: 0,
  });

  it('averages the three scores across reviews', () => {
    expect(ratingSummary([])).toBeNull();
    expect(ratingSummary([review(4, 5, 3), review(2, 2, 2)])).toEqual({ average: 3, count: 2 });
  });
});

describe('toiletStatus', () => {
  const noon = new Date(2026, 10, 13, 12);

  it('shows closed first, then customers-only, then open, then unknown', () => {
    expect(toiletStatus({ ...base, access: 'customers', openingHours: 'Mo-Fr 06:00-08:00' }, noon).tone).toBe('danger');
    expect(toiletStatus({ ...base, access: 'customers', openingHours: '24/7' }, noon).tone).toBe('warning');
    expect(toiletStatus({ ...base, openingHours: '24/7' }, noon).tone).toBe('success');
    expect(toiletStatus(base, noon).tone).toBe('neutral');
  });
});
