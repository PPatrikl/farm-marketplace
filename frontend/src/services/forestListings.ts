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