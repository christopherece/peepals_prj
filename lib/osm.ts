import type { Access, Coords, Toilet } from './types';

// Public Overpass instance — fine for an MVP, but move to our own backend
// (OSM import into Postgres/PostGIS) before real traffic.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

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
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      // Overpass rejects generic client user agents with a 406.
      'User-Agent': 'Peepals/0.1 (toilet finder app)',
    },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Couldn't load toilets (Overpass ${res.status}). Try again in a moment.`);
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements.map(toToilet).filter((t): t is Toilet => t !== null);
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
    name: tags.name ?? tags.operator ?? 'Public toilet',
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
