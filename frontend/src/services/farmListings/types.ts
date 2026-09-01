// Shared types and small pure helpers for the farm-listings domain.
// No Supabase calls here — only shapes and pure functions

import type { Farm } from '../../app/data/farms';

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

// ── Listing status ──────────────────────────────────────────────
export type ListingStatus = 'active' | 'closed' | 'draft' | 'expired';

// Derives the "real" status for display: an 'active' row whose date_end has
// passed is treated as 'expired' even before the DB row is updated.
export function getEffectiveStatus(row: { status: string; date_end: string }): ListingStatus {
  const today = new Date().toISOString().split('T')[0];
  if (row.status === 'active' && row.date_end < today) return 'expired';
  return row.status as ListingStatus;
}

// ── Price units / listing category ───────────────────────────────
export type PriceUnit = 'kg' | 'h' | 'day' | 'piece' | 'litre';
export type ListingCategory = 'picking' | 'job';

export const CATEGORY_TO_LISTING_TYPE: Record<ListingCategory, 'itsepoiminta' | 'kausityo'> = {
  picking: 'itsepoiminta',
  job: 'kausityo',
};

export const PICKING_UNITS: PriceUnit[] = ['kg', 'litre', 'piece'];
export const JOB_UNITS: PriceUnit[] = ['h', 'day', 'piece'];

export function allowedUnitsForCategory(category: ListingCategory): PriceUnit[] {
  return category === 'job' ? JOB_UNITS : PICKING_UNITS;
}

// ── Types from Supabase (farm_listings_full view) ────────────
export interface SupabaseFarmListing {
  id: string;
  type: 'itsepoiminta' | 'kausityo';
  status: string;
  title: string;
  description: string | null;
  crop_type: string | null;
  price: number;
  price_unit: string;
  date_start: string;
  date_end: string;
  spots_total: number | null;
  spots_remaining: number | null;
  farm_name: string;
  farm_city: string;
  farm_region: string;
  farm_rating: number | null;
  farm_review_count: number;
  owner_name: string;

  owner_id?: string;
  is_organic: boolean;
  is_accessible: boolean;
  family_friendly: boolean;
  dogs_allowed: boolean;
  accommodation: boolean;
  meals_included: boolean;
  transport: boolean;
  meal_allowance: boolean;
  contract_based: boolean;
  machine_work: boolean;
  primary_image_url: string | null;
}

// ── Public-facing farm shape used by the UI ──────────────────
export type FarmWithVerification = Farm & {
  hostPhoneVerified: boolean;
  hostIdentityVerified: boolean;
  hostFoodLicenceVerified: boolean;
  listingStatus: ListingStatus;
};