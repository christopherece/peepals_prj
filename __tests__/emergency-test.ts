import { findEmergencyToilet } from '@/lib/emergency';
import type { NearbyToilet } from '@/lib/types';

// Friday 13 November 2026, midday.
const NOON = new Date(2026, 10, 13, 12);

function toilet(id: string, distance: number | null, extra: Partial<NearbyToilet> = {}): NearbyToilet {
  return {
    id,
    name: id,
    latitude: 0,
    longitude: 0,
    fee: false,
    access: 'public',
    wheelchair: null,
    changingTable: null,
    genderNeutral: null,
    openingHours: '24/7',
    source: 'osm',
    distance,
    ...extra,
  };
}

describe('findEmergencyToilet', () => {
  it('returns null when there is nothing to pick', () => {
    expect(findEmergencyToilet([], NOON)).toBeNull();
  });

  it('picks the nearest usable toilet', () => {
    const pick = findEmergencyToilet([toilet('far', 400), toilet('near', 100)], NOON);
    expect(pick?.id).toBe('near');
  });

  it('skips paid, customers-only and closed toilets', () => {
    const pick = findEmergencyToilet(
      [
        toilet('paid', 10, { fee: true }),
        toilet('customers', 20, { access: 'customers' }),
        toilet('closed', 30, { openingHours: 'Mo-Fr 06:00-08:00' }),
        toilet('ok', 500),
      ],
      NOON
    );
    expect(pick?.id).toBe('ok');
  });

  it('allows unknown cost and unknown hours', () => {
    const pick = findEmergencyToilet([toilet('maybe', 100, { fee: null, openingHours: null })], NOON);
    expect(pick?.id).toBe('maybe');
  });

  it('prefers a confirmed-open toilet unless the unknown one is much closer', () => {
    // Unknown hours count as 1.5x the distance.
    expect(findEmergencyToilet([toilet('open', 140), toilet('unknown', 100, { openingHours: null })], NOON)?.id).toBe(
      'open'
    );
    expect(findEmergencyToilet([toilet('open', 160), toilet('unknown', 100, { openingHours: null })], NOON)?.id).toBe(
      'unknown'
    );
  });

  it('counts floors above or below street level as extra walking', () => {
    // A 50th-floor toilet next door loses to a street-level one a few blocks away.
    const pick = findEmergencyToilet([toilet('tower', 100, { level: 50 }), toilet('street', 220)], NOON);
    expect(pick?.id).toBe('street');
    // One floor down is barely a detour.
    expect(findEmergencyToilet([toilet('basement', 100, { level: -1 }), toilet('street', 150)], NOON)?.id).toBe(
      'basement'
    );
  });

  it('ignores toilets without a distance', () => {
    expect(findEmergencyToilet([toilet('nowhere', null)], NOON)).toBeNull();
  });
});
