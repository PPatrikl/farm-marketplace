// frontend/src/utils/distance.ts
//
// Distance helpers shared by every page that shows "X km".

export interface Coords {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Straight-line ("as the crow flies") distance between two points on Earth,
 * using the Haversine formula. Returns kilometres.
 */
export function distanceKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Distance from the user to a listing, or null when either position is unknown.
 * Accepts null/undefined so callers can pass database values directly.
 */
export function distanceTo(
  user: Coords | null,
  lat: number | null | undefined,
  lng: number | null | undefined,
): number | null {
  if (!user || lat == null || lng == null) return null;
  return distanceKm(user, { lat, lng });
}

/** "< 1 km", "12 km" or "— km" when the distance is unknown. */
export function formatDistance(km: number | null): string {
  if (km == null) return "— km";
  if (km < 1) return "< 1 km";
  return `${Math.round(km)} km`;
}