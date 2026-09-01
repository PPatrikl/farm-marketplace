// All READ-only queries against farm_listings / farm_listings_full.
// Writes (create/update/delete/status changes) live in listings.write.ts.


import { supabase } from '../../supabaseClient';
import type { FarmWithVerification, SupabaseFarmListing } from './types';
import { mapRowsToFarms } from './mappers';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export async function fetchFarmListings(): Promise<FarmWithVerification[]> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*')
    .eq('status', 'active')
    .gte('date_end', todayIso())
    .order('created_at', { ascending: false });
  if (error) { console.error('[farmListings] Supabase error:', error.message); return []; }
  return mapRowsToFarms(data as SupabaseFarmListing[]);
}

export async function fetchPickingListings(): Promise<FarmWithVerification[]> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*')
    .eq('status', 'active').eq('type', 'itsepoiminta')
    .gte('date_end', todayIso())
    .order('created_at', { ascending: false });
  if (error) { console.error('[farmListings] Supabase error:', error.message); return []; }
  return mapRowsToFarms(data as SupabaseFarmListing[]);
}

export async function fetchJobListings(): Promise<FarmWithVerification[]> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*')
    .eq('status', 'active').eq('type', 'kausityo')
    .gte('date_end', todayIso())
    .order('created_at', { ascending: false });
  if (error) { console.error('[farmListings] Supabase error:', error.message); return []; }
  return mapRowsToFarms(data as SupabaseFarmListing[]);
}

export async function fetchFarmListingById(id: string): Promise<FarmWithVerification | null> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('[farmListings] Supabase error:', error.message); return null; }
  if (!data) return null;
  const [farm] = await mapRowsToFarms([data as SupabaseFarmListing]);
  return farm;
}

// Raw (un-mapped) rows for the listing owner's own dashboard — the owner
// needs to see drafts/closed/expired too, which farm_listings_full's public
// "active only" filtering would hide.
export async function fetchOwnFarmListings(ownerId: string) {
  const { data, error } = await supabase
    .from('farm_listings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[farmListings] Error fetching own listings:', error.message); return []; }
  return data ?? [];
}