// services/farmListings.ts

import { supabase } from '../supabaseClient'
import type { Farm } from '../app/data/farms'
import type { UploadedImage } from './storage'
import { formatShortDate } from '../utils/dates';

// ── Farm amenities (all NOT NULL in DB) ───────────────────────
export interface FarmAmenities {
  is_organic: boolean;
  is_accessible: boolean;
  family_friendly: boolean;
  dogs_allowed: boolean;
}

export const EMPTY_FARM_AMENITIES: FarmAmenities = {
  is_organic: false,
  is_accessible: false,
  family_friendly: false,
  dogs_allowed: false,
};

export interface FarmRecord extends FarmAmenities {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  city: string;
  region: string;
  address: string | null;
  rating: number | null;
  review_count: number;
  is_active: boolean;
  created_at: string;
}

export interface UpsertFarmInput {
  name: string;
  description?: string;
  city: string;
  region: string;
  address?: string;
  amenities: FarmAmenities;
}

// ── Farm CRUD ──────────────────────────────────────────────────

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

// ── Listing status ──────────────────────────────────────────────
export type ListingStatus = 'active' | 'closed' | 'draft' | 'expired';

export function getEffectiveStatus(row: { status: string; date_end: string }): ListingStatus {
  const today = new Date().toISOString().split('T')[0];
  if (row.status === 'active' && row.date_end < today) return 'expired';
  return row.status as ListingStatus;
}

export async function syncExpiredFarmListings(ownerId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('farm_listings')
    .update({ status: 'expired' })
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .lt('date_end', today);

  if (error) console.error('[farmListings] Error syncing expired listings:', error.message);
}

export async function setFarmListingStatus(listingId: string, status: 'active' | 'closed' | 'draft') {
  const { data, error } = await supabase
    .from('farm_listings')
    .update({ status })
    .eq('id', listingId)
    .select()
    .single();

  if (error) {
    console.error('[farmListings] Error updating listing status:', error.message);
    throw error;
  }
  return data;
}

// ── Types from Supabase (farm_listings_full view) ────────────
interface SupabaseFarmListing {
  id: string
  type: 'itsepoiminta' | 'kausityo'
  status: string
  title: string
  description: string | null
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

  booking_required: boolean;   
  farm_address: string | null; 

  owner_id?: string
  is_organic: boolean
  is_accessible: boolean
  family_friendly: boolean
  dogs_allowed: boolean
  accommodation: boolean
  meals_included: boolean
  transport: boolean
  meal_allowance: boolean
  contract_based: boolean
  machine_work: boolean
  primary_image_url: string | null
}

// ── Host verification (batched, no view changes needed) ──────

interface OwnerVerification {
  phone_verified: boolean;
  identity_verified: boolean;
}

const DEFAULT_VERIFICATION: OwnerVerification = {
  phone_verified: false,
  identity_verified: false,
};

async function fetchOwnerVerification(ownerIds: (string | undefined)[]): Promise<Map<string, OwnerVerification>> {
  const uniqueIds = Array.from(new Set(ownerIds.filter((id): id is string => Boolean(id))));
  const result = new Map<string, OwnerVerification>();
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, phone_verified, identity_verified')
    .in('id', uniqueIds);

  if (error) {
    console.error('[farmListings] Error fetching owner verification:', error.message);
    return result;
  }

  for (const row of data ?? []) {
    result.set(row.id, {
      phone_verified: Boolean(row.phone_verified),
      identity_verified: Boolean(row.identity_verified),
    });
  }
  return result;
}

// ── Listing images (batched) ──────────────────────────────────

interface ListingImageRow {
  farm_listing_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

async function fetchListingImages(listingIds: string[]): Promise<Map<string, ListingImageRow[]>> {
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

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=520&fit=crop&auto=format';

export type FarmWithVerification = Farm & {
  hostPhoneVerified: boolean;
  hostIdentityVerified: boolean;
  hostFoodLicenceVerified: boolean;

  listingStatus: ListingStatus;
  bookingRequired: boolean;    
  spotsTotal: number | null;   
  address: string | null;      
};

function mapToFarm(
  row: SupabaseFarmListing,
  verification: OwnerVerification,
  images: ListingImageRow[],
): FarmWithVerification {
  const isPicking = row.type === 'itsepoiminta'
  const tags_fi: string[] = []
  const tags_en: string[] = []

  if (isPicking) {
    if (row.is_organic)        { tags_fi.push('Luomu');                tags_en.push('Organic') }
    if (row.is_accessible)     { tags_fi.push('Esteettömyys');         tags_en.push('Accessible') }
    if (row.family_friendly)   { tags_fi.push('Sopii perheille');      tags_en.push('Family-friendly') }
    if (row.dogs_allowed)      { tags_fi.push('Koirat sallittu');      tags_en.push('Dogs allowed') }
  } else {
    if (row.accommodation) { tags_fi.push('Majoitus tarjolla'); tags_en.push('Housing provided') }
    if (row.meals_included)  { tags_fi.push('Ateriat sisältyvät');  tags_en.push('Meals included') }
    if (row.transport)       { tags_fi.push('Kuljetukset');         tags_en.push('Transport') }
    if (row.meal_allowance)  { tags_fi.push('Ateria-avustus');      tags_en.push('Meal allowance') }
    if (row.contract_based)  { tags_fi.push('Sopimuspohjainen');    tags_en.push('Contract work') }
    if (row.machine_work)    { tags_fi.push('Konetyö');             tags_en.push('Machinery work') }
  }

  // const formatDate = (iso: string) => {
  //   const d = new Date(iso)
  //   return `${d.getDate()}.${d.getMonth() + 1}.`
  // }
  const unitMap: Record<string, string> = { kg: 'kg', h: 'h', day: 'pv', piece: 'kpl', litre: 'L' }

  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const primaryFromTable = sortedImages.find((i) => i.is_primary)?.url;
  const heroImage = primaryFromTable ?? row.primary_image_url ?? FALLBACK_IMAGE;
  const galleryImages = sortedImages.map((i) => i.url).filter((url) => url !== heroImage);

  return {
    id: row.id,
    name: row.farm_name,
    title: row.title,
    location_fi: `${row.farm_city}, ${row.farm_region}`,
    location_en: `${row.farm_city}, ${row.farm_region}`,
    city: row.farm_city,
    region_fi: row.farm_region,
    region_en: row.farm_region,
    type: isPicking ? 'picking' : 'job',
    produce_fi: row.crop_type ?? '',
    produce_en: row.crop_type ?? '',
    price: Number(row.price).toFixed(2),
    unit: unitMap[row.price_unit] ?? row.price_unit,
    dateStart: formatShortDate(row.date_start),
    dateEnd: formatShortDate(row.date_end),
    seasonStart: row.date_start,
    seasonEnd: row.date_end,
    rating: row.farm_rating ?? 0,
    reviews: row.farm_review_count ?? 0,
    image: heroImage,
    galleryImages,
    distance: '— km',
    openSpots: row.spots_remaining ?? 0,
    tags_fi,
    tags_en,
    description_fi: row.description ?? '',
    description_en: row.description ?? '',
    hostName: row.owner_name,
    hostInitials: row.owner_name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
    hostMemberSince_fi: '',
    hostMemberSince_en: '',
    hostRating: row.farm_rating ?? 0,
    hostReviews: row.farm_review_count ?? 0,
    hostPhoneVerified: verification.phone_verified,
    hostIdentityVerified: verification.identity_verified,
    hostFoodLicenceVerified: false,
    listingStatus: getEffectiveStatus({ status: row.status, date_end: row.date_end }),
    bookingRequired: Boolean(row.booking_required),
    spotsTotal: row.spots_total ?? null,
    address: row.farm_address ?? null,
  }
}

async function mapRowsToFarms(rows: SupabaseFarmListing[]): Promise<FarmWithVerification[]> {
  const [verificationMap, imagesMap] = await Promise.all([
    fetchOwnerVerification(rows.map((r) => r.owner_id)),
    fetchListingImages(rows.map((r) => r.id)),
  ]);

  return rows.map((row) =>
    mapToFarm(
      row,
      row.owner_id ? (verificationMap.get(row.owner_id) ?? DEFAULT_VERIFICATION) : DEFAULT_VERIFICATION,
      imagesMap.get(row.id) ?? [],
    )
  );
}

// ── Public read API ────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export async function fetchFarmListings(): Promise<FarmWithVerification[]> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*')
    .eq('status', 'active')
    .gte('date_end', todayIso())
    .order('created_at', { ascending: false })
  if (error) { console.error('[farmListings] Supabase error:', error.message); return [] }
  return mapRowsToFarms(data as SupabaseFarmListing[])
}

export async function fetchPickingListings(): Promise<FarmWithVerification[]> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*')
    .eq('status', 'active').eq('type', 'itsepoiminta')
    .gte('date_end', todayIso())
    .order('created_at', { ascending: false })
  if (error) { console.error('[farmListings] Supabase error:', error.message); return [] }
  return mapRowsToFarms(data as SupabaseFarmListing[])
}

export async function fetchJobListings(): Promise<FarmWithVerification[]> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*')
    .eq('status', 'active').eq('type', 'kausityo')
    .gte('date_end', todayIso())
    .order('created_at', { ascending: false })
  if (error) { console.error('[farmListings] Supabase error:', error.message); return [] }
  return mapRowsToFarms(data as SupabaseFarmListing[])
}

export async function fetchFarmListingById(id: string): Promise<FarmWithVerification | null> {
  const { data, error } = await supabase
    .from('farm_listings_full').select('*').eq('id', id).maybeSingle()
  if (error) { console.error('[farmListings] Supabase error:', error.message); return null }
  if (!data) return null
  const [farm] = await mapRowsToFarms([data as SupabaseFarmListing])
  return farm
}

export async function fetchOwnFarmListings(ownerId: string) {
  const { data, error } = await supabase
    .from('farm_listings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[farmListings] Error fetching own listings:', error.message); return []; }
  return data ?? [];
}

// ── Create / update / delete listing ────────────────────────
export type PriceUnit = 'kg' | 'h' | 'day' | 'piece' | 'litre'
export type ListingCategory = 'picking' | 'job'

const CATEGORY_TO_LISTING_TYPE: Record<ListingCategory, 'itsepoiminta' | 'kausityo'> = {
  picking: 'itsepoiminta',
  job: 'kausityo',
};

export const PICKING_UNITS: PriceUnit[] = ['kg', 'litre', 'piece'];
export const JOB_UNITS: PriceUnit[] = ['h', 'day', 'piece'];

export function allowedUnitsForCategory(category: ListingCategory): PriceUnit[] {
  return category === 'job' ? JOB_UNITS : PICKING_UNITS;
}

export interface CreateFarmListingInput {
  owner_id: string;
  farm_id: string;
  category: ListingCategory;   // → maps to farm_listings.type
  title: string;
  crop_type?: string;          // free text — actual produce/culture, NOT the category id
  price: number;
  price_unit: PriceUnit;
  capacity?: number;
  description?: string;
  images?: UploadedImage[];
  date_start?: string;
  date_end?: string;
  booking_required?: boolean;
  accommodation?: boolean;
  meals_included?: boolean;
  transport?: boolean;
  meal_allowance?: boolean;
  contract_based?: boolean;
  machine_work?: boolean;
  status?: 'active' | 'draft'; 
}

export async function createFarmListing(input: CreateFarmListingInput) {
  const listingType = CATEGORY_TO_LISTING_TYPE[input.category] ?? 'itsepoiminta';
  const today = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // No city/region here — farm_listings has no such columns, they live on farms.
  const { data: listing, error: listingError } = await supabase
    .from('farm_listings')
    .insert([{
      farm_id: input.farm_id,
      owner_id: input.owner_id,
      type: listingType,
      status: input.status ?? 'active',
      title: input.title,
      description: input.description || '',
      crop_type: input.crop_type || null,
      price: input.price,
      price_unit: input.price_unit || 'kg',
      date_start: input.date_start || today,
      date_end: input.date_end || defaultEndDate,
      spots_total: input.capacity ? Math.max(0, Math.round(input.capacity)) : null,
      spots_remaining: input.capacity ? Math.max(0, Math.round(input.capacity)) : null,
      booking_required: input.booking_required ?? false,
      accommodation: input.accommodation ?? false,
      meals_included: input.meals_included ?? false,
      transport: input.transport ?? false,
      meal_allowance: input.meal_allowance ?? false,
      contract_based: input.contract_based ?? false,
      machine_work: input.machine_work ?? false,
      view_count: 0,
      contact_count: 0,
    }])
    .select()
    .single();

  if (listingError || !listing) {
    console.error('[farmListings] Error creating listing:', listingError?.message);
    throw listingError;
  }

  if (input.images && input.images.length > 0) {
    const imageRecords = input.images.map((img, index) => ({
      farm_listing_id: listing.id,
      storage_path: img.path,
      url: img.url,
      is_primary: index === 0,
      sort_order: index,
    }));
    const { error: imagesError } = await supabase.from('listing_images').insert(imageRecords);
    if (imagesError) console.error('[farmListings] Error saving images:', imagesError.message);
  }

  return listing;
}

export interface UpdateFarmListingInput {
  category?: ListingCategory;  
  title?: string;
  crop_type?: string;
  description?: string;
  price?: number;
  price_unit?: PriceUnit;
  date_start?: string;
  date_end?: string;
  capacity?: number;           
  booking_required?: boolean;
  accommodation?: boolean;  
  meals_included?: boolean;
  transport?: boolean;
  meal_allowance?: boolean;
  contract_based?: boolean;
  machine_work?: boolean;
  images?: UploadedImage[];
}

export async function updateFarmListing(listingId: string, input: UpdateFarmListingInput) {
  const patch: Record<string, any> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.crop_type !== undefined) patch.crop_type = input.crop_type;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = input.price;
  if (input.price_unit !== undefined) patch.price_unit = input.price_unit;
  if (input.date_start !== undefined) patch.date_start = input.date_start;
  if (input.date_end !== undefined) patch.date_end = input.date_end;
  if (input.booking_required !== undefined) patch.booking_required = input.booking_required;
  if (input.accommodation !== undefined) {
    patch.accommodation = input.accommodation;
  }
  if (input.meals_included !== undefined) patch.meals_included = input.meals_included;
  if (input.transport !== undefined) patch.transport = input.transport;
  if (input.meal_allowance !== undefined) patch.meal_allowance = input.meal_allowance;
  if (input.contract_based !== undefined) patch.contract_based = input.contract_based;
  if (input.machine_work !== undefined) patch.machine_work = input.machine_work;
  if (input.category !== undefined) patch.type = CATEGORY_TO_LISTING_TYPE[input.category] ?? 'itsepoiminta';

  if (input.capacity !== undefined) {
    const newTotal = Math.max(0, Math.round(input.capacity));
      patch.spots_total = newTotal;
    }

  if (input.date_end !== undefined) {
    const today = new Date().toISOString().split('T')[0];
    const { data: current } = await supabase
      .from('farm_listings').select('status').eq('id', listingId).maybeSingle();
    if (current?.status === 'expired' && input.date_end >= today) {
      patch.status = 'active';
    }
  }

  const { data, error } = await supabase
    .from('farm_listings').update(patch).eq('id', listingId).select().single();

  if (error) {
    console.error('[farmListings] Error updating listing:', error.message);
    throw error;
  }

  if (input.images && input.images.length > 0) {
    const { data: existing } = await supabase
      .from('listing_images')
      .select('sort_order')
      .eq('farm_listing_id', listingId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const imageRecords = input.images.map((img, index) => ({
      farm_listing_id: listingId,
      storage_path: img.path,
      url: img.url,
      is_primary: false,
      sort_order: nextSortOrder + index,
    }));
    const { error: imagesError } = await supabase.from('listing_images').insert(imageRecords);
    if (imagesError) console.error('[farmListings] Error saving images:', imagesError.message);
  }

  return data;
}

export async function deleteFarmListing(listingId: string) {
  const { error } = await supabase.from('farm_listings').delete().eq('id', listingId);
  if (error) {
    console.error('[farmListings] Error deleting listing:', error.message);
    throw error;
  }
}