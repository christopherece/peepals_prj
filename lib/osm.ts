import type { Access, Coords, Toilet } from './types';

// Public Overpass instances, in order of preference. They are community-run and regularly answer
// 429/502/504 or simply hang, so we don't wait on one at a time (see queryOverpass).
// Fine for an MVP, but move to our own backend (OSM import into Postgres/PostGIS) before real traffic.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
/** How long one mirror gets to answer. */
const REQUEST_TIMEOUT_MS = 20_000;
/** If a mirror hasn't answered by now, the next one is asked as well. */
const HEDGE_DELAY_MS = 4_000;

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

type OverpassResponse = { elements: OsmElement[] };

/**
 * Asks the mirrors in order, moving on as soon as one fails or after HEDGE_DELAY_MS without an answer.
 * The first good answer wins and the rest are cancelled.
 */
function queryOverpass(query: string): Promise<OverpassResponse> {
  return new Promise((resolve, reject) => {
    const controllers: AbortController[] = [];
    let started = 0;
    let failed = 0;
    let settled = false;
    let hedge: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: OverpassResponse | null) => {
      settled = true;
      clearTimeout(hedge);
      controllers.forEach((c) => c.abort());
      if (result) resolve(result);
      else reject(new Error("Couldn't load toilets: the map data servers are busy. Try again in a moment."));
    };

    const startNext = () => {
      if (settled || started >= OVERPASS_URLS.length) return;
      const url = OVERPASS_URLS[started++];
      clearTimeout(hedge);
      hedge = setTimeout(startNext, HEDGE_DELAY_MS);

      const controller = new AbortController();
      controllers.push(controller);
      queryMirror(url, query, controller).then(
        (json) => {
          if (!settled) finish(json);
        },
        (e) => {
          if (settled) return;
          console.warn(`Overpass mirror failed (${url}):`, e);
          failed++;
          if (failed === OVERPASS_URLS.length) finish(null);
          else if (failed === started) startNext();
        }
      );
    };

    startNext();
  });
}

async function queryMirror(url: string, query: string, controller: AbortController): Promise<OverpassResponse> {
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        // Overpass rejects generic client user agents with a 406.
        'User-Agent': 'Peepals/1.0 (toilet finder app)',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const json = await res.json();
    // An overloaded server can answer 200 with an error body instead of results.
    if (!Array.isArray(json?.elements)) throw new Error('Overpass sent no results');
    return json;
  } finally {
    clearTimeout(timer);
  }
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
    level: toLevel(tags.level),
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

/** "50" → 50, "-1 (below ground level)" → -1, "0,1,2" → 0. */
function toLevel(value: string | undefined): number | null {
  const level = Number.parseFloat(value ?? '');
  return Number.isFinite(level) ? level : null;
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
