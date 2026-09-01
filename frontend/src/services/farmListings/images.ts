// Batched lookup of listing images (listing_images table) for a set of
// listing ids. Kept separate from mappers.ts for the same reason as
// verification.ts — this is the Supabase-touching piece

import { supabase } from '../../supabaseClient';

export interface ListingImageRow {
  farm_listing_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export async function fetchListingImages(listingIds: string[]): Promise<Map<string, ListingImageRow[]>> {
  const result = new Map<string, ListingImageRow[]>();
  if (listingIds.length === 0) return result;

  const { data, error } = await supabase
    .from('listing_images')
    .select('farm_listing_id, url, is_primary, sort_order')
    .in('farm_listing_id', listingIds)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[farmListings] Error fetching listing images:', error.message);
    return result;
  }

  for (const row of data ?? []) {
    const list = result.get(row.farm_listing_id) ?? [];
    list.push(row);
    result.set(row.farm_listing_id, list);
  }
  return result;
}