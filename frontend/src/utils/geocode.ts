// frontend/src/utils/geocode.ts
//
// Turns an address or town name into coordinates, using OpenStreetMap's
// free geocoder Nominatim: https://nominatim.org/release-docs/latest/api/Search/
//
// Usage policy:
//   - at most 1 request per second
//   - show "© OpenStreetMap" attribution 
// Call it when a farm / forest listing is saved, so it stays below the limit
//
// The listing is then saved without coordinates if any problem occurs.

import type { Coords } from "./distance";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One lookup, limited to Finland. Returns null if nothing was found or the request failed. */
export async function geocode(query: string): Promise<Coords | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    countrycodes: "fi",   // only results in Finland
    limit: "1",           // we only need the best match
    "accept-language": "fi",
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    // Nominatim returns lat/lon as strings
    const results: { lat: string; lon: string }[] = await res.json();
    if (results.length === 0) return null;

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn("[geocode] Lookup failed:", err);
    return null;
  }
}

/** Tries the queries in order (most precise first) and returns the first hit */
export async function geocodeFirst(queries: (string | null | undefined)[]): Promise<Coords | null> {
  const usable = queries.filter((q): q is string => Boolean(q && q.trim()));
  for (let i = 0; i < usable.length; i++) {
    if (i > 0) await sleep(1000);
    const coords = await geocode(usable[i]);
    if (coords) return coords;
  }
  return null;
}

/* Coordinates in the text format PostGIS accepts for a geography column. */
export function toPostgisPoint(c: Coords): string {
  return `SRID=4326;POINT(${c.lng} ${c.lat})`;
}

/**
 * For a street address in a town: tries "address, town" first, then just the town.
 * Also tells whether the street address itself was found (exact) or only the town.
 */
export async function geocodeAddress(
  address: string | null | undefined,
  city: string,
): Promise<{ coords: Coords; exact: boolean } | null> {
  const full = address && address.trim() ? `${address.trim()}, ${city}` : null;
  if (full) {
    const coords = await geocode(full);
    if (coords) return { coords, exact: true };
    await sleep(1000); // Nominatim: max 1 request per second
  }
  const coords = await geocode(city);
  return coords ? { coords, exact: false } : null;
}