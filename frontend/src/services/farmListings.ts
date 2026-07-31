// frontend/src/services/farmListings.ts
//
// Fetches farm listings from Supabase and maps them to the Farm interface

import { supabase } from '../supabaseClient'
import type { Farm } from '../app/data/farms'

// ── Types from Supabase (farm_listings_full view) ────────────
interface SupabaseFarmListing {
  id: string
  type: 'itsepoiminta' | 'kausityo'
  status: string
  title: string
  crop_type: string | null
  price: number
  price_unit: string
  date_start: string
  date_end: string
  spots_total: number | null
  spots_remaining: number | null
  farm_name: string
  farm_city: string
  farm_region: string
  farm_rating: number | null
  farm_review_count: number
  owner_name: string
  // Farm amenities
  is_organic: boolean
  has_parking: boolean
  is_accessible: boolean
  family_friendly: boolean
  kids_welcome: boolean
  dogs_allowed: boolean
  has_cafe: boolean
  beautiful_scenery: boolean
  has_lean_to: boolean
  // Kausityö amenities
  accommodation: boolean
  meals_included: boolean
  transport: boolean
  meal_allowance: boolean
  contract_based: boolean
  machine_work: boolean
  housing: boolean
  // Images
  primary_image_url: string | null
}

// ── Map Supabase row → Farm interface ────────────────────────
function mapToFarm(row: SupabaseFarmListing, index: number): Farm {
  const isPicking = row.type === 'itsepoiminta'

  // Build tags from boolean fields
  const tags_fi: string[] = []
  const tags_en: string[] = []

  // Farm amenity tags
  if (row.family_friendly)  { tags_fi.push('Sopii perheille');       tags_en.push('Family-friendly') }
  if (row.has_parking)      { tags_fi.push('Parkkipaikka');           tags_en.push('Parking') }
  if (row.is_accessible)    { tags_fi.push('Esteettömyys');           tags_en.push('Accessible') }
  if (row.is_organic)       { tags_fi.push('Luomu');                  tags_en.push('Organic') }
  if (row.kids_welcome)     { tags_fi.push('Lapset tervetulleita');   tags_en.push('Children welcome') }
  if (row.dogs_allowed)     { tags_fi.push('Koirat sallittu');        tags_en.push('Dogs allowed') }
  if (row.has_cafe)         { tags_fi.push('Kahvila');                tags_en.push('Café') }
  if (row.beautiful_scenery){ tags_fi.push('Kaunis maisema');         tags_en.push('Scenic location') }
  if (row.has_lean_to)      { tags_fi.push('Laavu');                  tags_en.push('Lean-to shelter') }
  // Kausityö tags
  if (row.accommodation)    { tags_fi.push('Majoitus järjestetty');   tags_en.push('Accommodation provided') }
  if (row.meals_included)   { tags_fi.push('Ateriat sisältyvät');     tags_en.push('Meals included') }
  if (row.transport)        { tags_fi.push('Kuljetukset');            tags_en.push('Transport') }
  if (row.meal_allowance)   { tags_fi.push('Ateria-avustus');         tags_en.push('Meal allowance') }
  if (row.contract_based)   { tags_fi.push('Sopimuspohjainen');       tags_en.push('Contract work') }
  if (row.machine_work)     { tags_fi.push('Konetyö');                tags_en.push('Machinery work') }
  if (row.housing)          { tags_fi.push('Asuminen järjestetty');   tags_en.push('Housing provided') }

  // Format dates from ISO to Finnish short format (e.g. "2026-06-20" → "20.6.")
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()}.${d.getMonth() + 1}.`
  }

  // Map price unit
  const unitMap: Record<string, string> = {
    kg: 'kg', h: 'h', day: 'pv', piece: 'kpl', litre: 'L'
  }

  return {
    id: row.id,                                // Use the real Supabase UUID for bookings
    name: row.farm_name,
    location_fi: `${row.farm_city}, ${row.farm_region}`,
    location_en: `${row.farm_city}, ${row.farm_region}`,
    city: row.farm_city,
    region_fi: row.farm_region,
    region_en: row.farm_region,
    type: isPicking ? 'picking' : 'job',
    produce_fi: row.crop_type ?? row.title,
    produce_en: row.crop_type ?? row.title,
    price: Number(row.price).toFixed(2),
    unit: unitMap[row.price_unit] ?? row.price_unit,
    dateStart: formatDate(row.date_start),
    dateEnd: formatDate(row.date_end),
    seasonStart: row.date_start,
    seasonEnd: row.date_end,
    rating: row.farm_rating ?? 0,
    reviews: row.farm_review_count ?? 0,
    image: row.primary_image_url ?? 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=520&fit=crop&auto=format',
    galleryImages: [],
    distance: '— km',                        // requires PostGIS query with user location
    openSpots: row.spots_remaining ?? 0,
    tags_fi,
    tags_en,
    description_fi: '',
    description_en: '',
    hostName: row.owner_name,
    hostInitials: row.owner_name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
    hostMemberSince_fi: '',
    hostMemberSince_en: '',
    hostRating: row.farm_rating ?? 0,
    hostReviews: row.farm_review_count ?? 0,
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Fetch all active farm listings from Supabase.
 * Returns data in the Farm shape that FarmCard expects.
 */
export async function fetchFarmListings(): Promise<Farm[]> {
  const { data, error } = await supabase
    .from('farm_listings_full')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[farmListings] Supabase error:', error.message)
    return []
  }

  return (data as SupabaseFarmListing[]).map(mapToFarm)
}

/**
 * Fetch only itsepoiminta listings.
 */
export async function fetchPickingListings(): Promise<Farm[]> {
  const { data, error } = await supabase
    .from('farm_listings_full')
    .select('*')
    .eq('status', 'active')
    .eq('type', 'itsepoiminta')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[farmListings] Supabase error:', error.message)
    return []
  }

  return (data as SupabaseFarmListing[]).map(mapToFarm)
}

/**
 * Fetch only kausityö listings.
 */
export async function fetchJobListings(): Promise<Farm[]> {
  const { data, error } = await supabase
    .from('farm_listings_full')
    .select('*')
    .eq('status', 'active')
    .eq('type', 'kausityo')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[farmListings] Supabase error:', error.message)
    return []
  }

  return (data as SupabaseFarmListing[]).map(mapToFarm)
}