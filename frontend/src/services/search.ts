import { supabase } from '../supabaseClient';
import { FOREST_COLORS } from './recentActivity'; 

export interface SearchResult {
  id: string;
  kind: 'farm' | 'forest';
  category: 'picking' | 'job' | 'forest';
  title: string;
  subtitle: string;
  city: string;
  color: string;
}

// Characters that break .or() syntax or act as wildcards in LIKE
function sanitize(q: string): string {
  return q.replace(/[%_,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function searchListings(rawQuery: string, limitPerKind = 4): Promise<SearchResult[]> {
  const q = sanitize(rawQuery);
  if (q.length < 2) return [];

  const pattern = `%${q}%`;
  const today = new Date().toISOString().split('T')[0];

  const [farmRes, forestRes] = await Promise.all([
    supabase
      .from('farm_listings_full')
      .select('id, type, title, farm_name, farm_city')
      .eq('status', 'active')
      .gte('date_end', today)
      .or(`title.ilike.${pattern},crop_type.ilike.${pattern},farm_name.ilike.${pattern},farm_city.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limitPerKind),
    supabase
      .from('forest_listings_full')
      .select('id, product_type, product_name, city, seller_name')
      .eq('status', 'active')
      .or(`product_name.ilike.${pattern},city.ilike.${pattern},region.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limitPerKind),
  ]);

  if (farmRes.error) throw farmRes.error;
  if (forestRes.error) throw forestRes.error;

  const farms = (farmRes.data ?? []).map((r: any): SearchResult => ({
    id: r.id,
    kind: 'farm',
    category: r.type === 'kausityo' ? 'job' : 'picking',
    title: r.title,
    subtitle: r.farm_name ?? '',
    city: r.farm_city ?? '',
    color: r.type === 'kausityo' ? '#B8293A' : '#2A5012',
  }));

  const forest = (forestRes.data ?? []).map((r: any): SearchResult => ({
    id: r.id,
    kind: 'forest',
    category: 'forest',
    title: r.product_name,
    subtitle: r.seller_name ?? '',
    city: r.city ?? '',
    color: FOREST_COLORS[r.product_type] ?? '#4A7C2F',
  }));

  return [...farms, ...forest];
}