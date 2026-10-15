import { getRecentFarmListings } from './farmListings';
import { getRecentForestListings } from './forestListings';
import { formatTimeAgo } from '../utils/dates'; 

export interface RecentActivityItem {
  id: string;
  kind: 'farm' | 'forest';
  title: string;
  authorName: string;
  city: string | null;
  createdAt: string;  
  timeAgoFi: string;
  timeAgoEn: string;
  color: string;
  lat: number | null;
  lng: number | null;
}


export const FOREST_COLORS: Record<string, string> = {
  marjat: '#3B5EA6',
  sienet: '#D4A853',
  muut: '#4A7C2F',
};

function mapFarmListing(row: any): RecentActivityItem {
  return {
    id: row.id,
    kind: 'farm',
    title: row.title,
    authorName: row.farm_name ?? '',
    city: row.farm_city ?? null,
    createdAt: row.created_at,
    timeAgoFi: formatTimeAgo(row.created_at, 'fi'),
    timeAgoEn: formatTimeAgo(row.created_at, 'en'),
    color: row.type === 'kausityo' ? '#B8293A' : '#2A5012',
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
}

function mapForestListing(row: any): RecentActivityItem {
  return {
    id: row.id,
    kind: 'forest',
    title: row.product_name,
    authorName: row.seller_name ?? '',
    city: row.city,
    createdAt: row.created_at,
    timeAgoFi: formatTimeAgo(row.created_at, 'fi'),
    timeAgoEn: formatTimeAgo(row.created_at, 'en'),
    color: FOREST_COLORS[row.product_type] ?? '#4A7C2F',
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
}

export async function getRecentActivity(limit = 4): Promise<RecentActivityItem[]> {
  const [farmRows, forestRows] = await Promise.all([
    getRecentFarmListings(limit),
    getRecentForestListings(limit),
  ]);

  const combined = [
    ...farmRows.map(mapFarmListing),
    ...forestRows.map(mapForestListing),
  ];

  combined.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return combined.slice(0, limit);
}