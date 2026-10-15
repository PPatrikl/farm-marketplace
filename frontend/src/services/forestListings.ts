// Fetches forest listings from Supabase and maps them to the shape
// that ForagerMarket expects. Keeps ForestCard untouched.

import { supabase } from '../supabaseClient'

// Type from Supabase (forest_listings_full view)
export interface ForestListing {
  id: string
  product_type: 'marjat' | 'sienet' | 'muut'
  product_name: string
  description: string | null
  quantity: number
  unit: 'kg' | 'litre' | 'piece'
  price_per_unit: number
  harvested_at: string | null
  delivery_available: boolean
  city: string
  region: string
  seller_id: string
  seller_name: string
  seller_avatar: string | null
  seller_rating: number | null
  seller_review_count: number
  identity_verified: boolean
  harvested_today: boolean
  primary_image_url: string | null
  created_at: string
  status: string
  lat: number | null
  lng: number | null
}

/** Fetch all active forest listings from Supabase */
export async function fetchForestListings(): Promise<ForestListing[]> {
  const { data, error } = await supabase
    .from('forest_listings_full')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[forestListings] Supabase error:', error.message)
    return []
  }

  return data as ForestListing[]
}

/** Fetch only berry listings */
export async function fetchBerryListings(): Promise<ForestListing[]> {
  const { data, error } = await supabase
    .from('forest_listings_full')
    .select('*')
    .eq('product_type', 'marjat')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[forestListings] Supabase error:', error.message)
    return []
  }

  return data as ForestListing[]
}

/** Fetch only mushroom listings */
export async function fetchMushroomListings(): Promise<ForestListing[]> {
  const { data, error } = await supabase
    .from('forest_listings_full')
    .select('*')
    .eq('product_type', 'sienet')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[forestListings] Supabase error:', error.message)
    return []
  }

  return data as ForestListing[]
}

import type { UploadedImage } from './storage'; 

export interface CreateForestListingInput {
  seller_id: string;
  product_name: string;
  product_type: string;
  price_per_unit: number;
  unit: string;
  quantity: number;
  city: string;
  region: string;
  description?: string;
  delivery_available?: boolean;
  pickup_only?: boolean;
  images?: UploadedImage[]; 
}

export async function createForestListing(input: CreateForestListingInput) {
  const { data, error } = await supabase
    .from('forest_listings')
    .insert([
      {
        seller_id: input.seller_id,
        product_name: input.product_name,
        product_type: input.product_type,
        price_per_unit: input.price_per_unit,
        unit: input.unit,
        quantity: input.quantity,
        city: input.city,
        region: input.region,
        description: input.description,
        delivery_available: input.delivery_available ?? false,
        pickup_only: input.pickup_only ?? true,
        status: 'active',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[forestListings] Error creating ad:', error.message); 
    throw error;
  }

  if (data && input.images && input.images.length > 0) {
    const imageRecords = input.images.map((img, index) => ({
      forest_listing_id: data.id,
      storage_path: img.path,
      url: img.url,
      is_primary: index === 0,
      sort_order: index,
    }));

    const { error: imagesError } = await supabase
      .from('listing_images')
      .insert(imageRecords);

    if (imagesError) {
      console.error('[forestListings] Error saving images:', imagesError.message);
    }
  }

  return data;
}

export interface UpdateForestListingInput {
  product_name?: string;
  product_type?: string;
  price_per_unit?: number;
  unit?: string;
  quantity?: number;
  city?: string;
  region?: string;
  description?: string;
  delivery_available?: boolean;
  pickup_only?: boolean;
  images?: UploadedImage[]; // any images here are appended as new listing_images rows
}

export async function updateForestListing(listingId: string, input: UpdateForestListingInput) {
  const patch: Record<string, any> = {};

  if (input.product_name !== undefined) patch.product_name = input.product_name;
  if (input.product_type !== undefined) patch.product_type = input.product_type;
  if (input.price_per_unit !== undefined) patch.price_per_unit = input.price_per_unit;
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.city !== undefined) patch.city = input.city;
  if (input.region !== undefined) patch.region = input.region;
  if (input.description !== undefined) patch.description = input.description;
  if (input.delivery_available !== undefined) patch.delivery_available = input.delivery_available;
  if (input.pickup_only !== undefined) patch.pickup_only = input.pickup_only;

  const { data, error } = await supabase
    .from('forest_listings')
    .update(patch)
    .eq('id', listingId)
    .select()
    .single();

  if (error) {
    console.error('[forestListings] Error updating ad:', error.message);
    throw error;
  }

  if (input.images && input.images.length > 0) {
    const imageRecords = input.images.map((img, index) => ({
      forest_listing_id: listingId,
      storage_path: img.path,
      url: img.url,
      is_primary: false, 
      sort_order: index,
    }));

    const { error: imagesError } = await supabase
      .from('listing_images')
      .insert(imageRecords);

    if (imagesError) {
      console.error('[forestListings] Error saving images:', imagesError.message);
    }
  }

  return data;
}

export async function deleteForestListing(listingId: string) {
  const { error } = await supabase
    .from('forest_listings')
    .delete()
    .eq('id', listingId);

  if (error) {
    console.error('[forestListings] Error deleting ad:', error.message);
    throw error;
  }
}

// --  for landing page -----------
export async function getRecentForestListings(limit: number) {
  const { data, error } = await supabase
    .from('forest_listings_full')
    .select('id, product_type, product_name, city, created_at, seller_name, lat, lng')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}