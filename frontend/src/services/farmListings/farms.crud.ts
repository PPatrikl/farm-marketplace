// CRUD for the `farms` table itself (one farm per owner) — separate from
// farm_listings CRUD, which lives in listings.read.ts / listings.write.ts.

import { supabase } from '../../supabaseClient';
import type { FarmRecord, UpsertFarmInput } from './types';

/** A user owns at most one farm — looked up via farms.owner_id, never profiles.farm_id. */
export async function fetchOwnFarm(ownerId: string): Promise<FarmRecord | null> {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    console.error('[farmListings] Error fetching farm:', error.message);
    return null;
  }
  return data;
}

export async function createFarm(ownerId: string, input: UpsertFarmInput): Promise<FarmRecord> {
  const { data, error } = await supabase
    .from('farms')
    .insert([{
      owner_id: ownerId,
      name: input.name,
      description: input.description || null,
      city: input.city,
      region: input.region,
      address: input.address || null,
      // Every amenity flag is NOT NULL in the DB — always send a concrete boolean.
      
      ...input.amenities,
      review_count: 0,
      is_active: true,
    }])
    .select()
    .single();

  if (error || !data) {
    console.error('[farmListings] Error creating farm:', error?.message);
    throw error;
  }
  return data;
}

export async function updateFarm(farmId: string, input: Partial<UpsertFarmInput>): Promise<FarmRecord> {
  const patch: Record<string, any> = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.city !== undefined) patch.city = input.city;
  if (input.region !== undefined) patch.region = input.region;
  if (input.address !== undefined) patch.address = input.address;
  if (input.amenities) Object.assign(patch, input.amenities);

  const { data, error } = await supabase
    .from('farms')
    .update(patch)
    .eq('id', farmId)
    .select()
    .single();

  if (error) {
    console.error('[farmListings] Error updating farm:', error.message);
    throw error;
  }
  return data;
}