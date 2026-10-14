// frontend/src/services/mapPoints.ts
//
// Loads every active listing that has coordinates, for the
// "Lähialueen toiminta" map on Etusivu.

import { supabase } from '../supabaseClient';

export type MapPointKind = 'picking' | 'job' | 'forest';

export interface MapPoint {
  id: string;
  /** 'farm' or 'forest' — same as RecentActivityItem.kind, so openListing() works */
  source: 'farm' | 'forest';
  kind: MapPointKind;
  title: string;
  place: string;   // farm name or town
  lat: number;
  lng: number;
}

/** Same colours as the legend on the map */
export const MAP_COLORS: Record<MapPointKind, string> = {
  picking: '#2A5012', // Tila
  job: '#B8293A',     // Työ
  forest: '#D4A853',  // Keruu
};

export async function getMapPoints(): Promise<MapPoint[]> {
  const today = new Date().toISOString().split('T')[0];

  const [farmRes, forestRes] = await Promise.all([
    supabase
      .from('farm_listings_full')
      .select('id, type, title, farm_name, farm_city, lat, lng')
      .eq('status', 'active')
      .gte('date_end', today)
      .not('lat', 'is', null),
    supabase
      .from('forest_listings_full')
      .select('id, product_name, city, lat, lng')
      .eq('status', 'active')
      .not('lat', 'is', null),
  ]);

  if (farmRes.error) throw farmRes.error;
  if (forestRes.error) throw forestRes.error;

  const farms = (farmRes.data ?? []).map((r: any): MapPoint => ({
    id: r.id,
    source: 'farm',
    kind: r.type === 'kausityo' ? 'job' : 'picking',
    title: r.title,
    place: [r.farm_name, r.farm_city].filter(Boolean).join(' · '),
    lat: r.lat,
    lng: r.lng,
  }));

  const forest = (forestRes.data ?? []).map((r: any): MapPoint => ({
    id: r.id,
    source: 'forest',
    kind: 'forest',
    title: r.product_name,
    place: r.city ?? '',
    lat: r.lat,
    lng: r.lng,
  }));

  return [...farms, ...forest];
}