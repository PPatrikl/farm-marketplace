// services/listingImages.ts

import { supabase } from '../supabaseClient';

export interface ListingImageRecord {
  id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export async function fetchImagesForListing(
  listingId: string,
  kind: 'farm' | 'forest'
): Promise<ListingImageRecord[]> {
  const column = kind === 'farm' ? 'farm_listing_id' : 'forest_listing_id';
  const { data, error } = await supabase
    .from('listing_images')
    .select('id, url, storage_path, is_primary, sort_order')
    .eq(column, listingId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('[listingImages] fetch error:', error.message); return []; }
  return data ?? [];
}

export async function deleteListingImage(imageId: string): Promise<void> {
  const { error } = await supabase.from('listing_images').delete().eq('id', imageId);
  if (error) { console.error('[listingImages] delete error:', error.message); throw error; }
}