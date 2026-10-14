import { supabase } from '../supabaseClient';

export interface LandingStats {
  activeFarms: number;
  registeredPickers: number;
  listingsThisWeek: number;
}

export async function getLandingStats(): Promise<LandingStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [farmsRes, profilesRes, farmListingsWeekRes, forestListingsWeekRes] = await Promise.all([
    supabase.from('farms').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('farm_listings').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('forest_listings').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
  ]);

  return {
    activeFarms: farmsRes.count ?? 0,
    registeredPickers: profilesRes.count ?? 0,
    listingsThisWeek: (farmListingsWeekRes.count ?? 0) + (forestListingsWeekRes.count ?? 0),
  };
}

export interface CategoryCounts {
  pickingCount: number;
  jobsCount: number;
  forestCount: number;
}

export async function getCategoryCounts(): Promise<CategoryCounts> {
  const [pickingRes, jobsRes, forestRes] = await Promise.all([
    supabase.from('farm_listings').select('id', { count: 'exact', head: true })
      .eq('status', 'active').eq('type', 'itsepoiminta'),
    supabase.from('farm_listings').select('id', { count: 'exact', head: true })
      .eq('status', 'active').eq('type', 'kausityo'),
    supabase.from('forest_listings').select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  return {
    pickingCount: pickingRes.count ?? 0,
    jobsCount: jobsRes.count ?? 0,
    forestCount: forestRes.count ?? 0,
  };
}