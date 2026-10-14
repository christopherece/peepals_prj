import type { Access, Coords, Toilet } from './types';

// Public Overpass instances, tried in order: the main one often answers 429/504 under load.
// Fine for an MVP, but move to our own backend (OSM import into Postgres/PostGIS) before real traffic.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const REQUEST_TIMEOUT_MS = 10_000;

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function fetchNearbyToilets(center: Coords, radiusMeters = 2000): Promise<Toilet[]> {
  const query = `[out:json][timeout:25];nwr["amenity"="toilets"](around:${radiusMeters},${center.latitude},${center.longitude});out center tags;`;
  const json = await queryOverpass(query);
  return json.elements.map(toToilet).filter((t): t is Toilet => t !== null);
}

async function queryOverpass(query: string): Promise<{ elements: OsmElement[] }> {
  let lastError: unknown;
  for (const url of OVERPASS_URLS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          // Overpass rejects generic client user agents with a 406.
          'User-Agent': 'Peepals/0.1 (toilet finder app)',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      if (res.ok) return await res.json();
      lastError = new Error(`Overpass ${res.status}`);
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
    console.warn(`Overpass mirror failed (${url}):`, lastError);
  }
  throw new Error("Couldn't load toilets: the map data servers are busy. Try again in a moment.");
}

function toToilet(el: OsmElement): Toilet | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const tags = el.tags ?? {};
  if (lat == null || lon == null) return null;
  // Skip toilets the public can't use at all.
  if (tags.access === 'private' || tags.access === 'no') return null;

  return {
    id: `osm-${el.type}-${el.id}`,
    name: toiletName(tags),
    latitude: lat,
    longitude: lon,
    fee: yesNo(tags.fee),
    access: toAccess(tags.access),
    wheelchair: yesNo(tags.wheelchair),
    changingTable: yesNo(tags.changing_table),
    genderNeutral: tags.unisex === 'yes' || tags.gender_segregated === 'no' ? true : yesNo(tags.unisex),
    openingHours: tags.opening_hours ?? null,
    source: 'osm',
  };
}

/** Most OSM toilets are unnamed, so fall back to who runs it or where it is before a generic label. */
function toiletName(tags: Record<string, string>): string {
  const named = tags.name ?? tags.operator ?? tags.brand;
  if (named) return named;
  const street = tags['addr:street'];
  if (street) return `Toilets on ${street}`;
  if (tags.level && tags.level !== '0') return `Toilets, level ${tags.level}`;
  if (tags.access === 'customers') return 'Customer toilets';
  return 'Public toilets';
}

function yesNo(value: string | undefined): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

function toAccess(value: string | undefined): Access {
  if (value === 'customers') return 'customers';
  if (value === 'yes' || value === 'public' || value === 'permissive') return 'public';
  return 'unknown';
}
