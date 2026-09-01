// All WRITE operations on farm_listings: create, update, delete, status
// changes, and the expired-listing sync job. Reads live in listings.read.ts.
//
// Все операции записи над farm_listings: создание, обновление, удаление,
// смена статуса и джоба синхронизации просроченных объявлений.
// Чтение — в listings.read.ts.

import { supabase } from '../../supabaseClient';
import type { UploadedImage } from '../storage';
import { CATEGORY_TO_LISTING_TYPE, type ListingCategory, type PriceUnit } from './types';

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
  // Здесь нет city/region — у farm_listings нет таких колонок, они на farms.
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
      // Negative-capacity guard: the DB check constraint "spots_valid" only
      // enforces spots_remaining <= spots_total, it does NOT check that
      // either value is >= 0. Without Math.max(0, ...) a negative input
      // would silently satisfy the constraint (e.g. -5 <= -5).
      //
      // Защита от отрицательной ёмкости: ограничение БД "spots_valid"
      // проверяет только spots_remaining <= spots_total и НЕ проверяет,
      // что значения >= 0. Без Math.max(0, ...) отрицательное число молча
      // пройдёт constraint (например, -5 <= -5).
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
  category?: ListingCategory;  // → updates type
  title?: string;
  crop_type?: string;
  description?: string;
  price?: number;
  price_unit?: PriceUnit;
  date_start?: string;
  date_end?: string;
  capacity?: number;           // → spots_total AND spots_remaining, see note below
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
  if (input.accommodation !== undefined) patch.accommodation = input.accommodation;
  if (input.meals_included !== undefined) patch.meals_included = input.meals_included;
  if (input.transport !== undefined) patch.transport = input.transport;
  if (input.meal_allowance !== undefined) patch.meal_allowance = input.meal_allowance;
  if (input.contract_based !== undefined) patch.contract_based = input.contract_based;
  if (input.machine_work !== undefined) patch.machine_work = input.machine_work;
  if (input.category !== undefined) patch.type = CATEGORY_TO_LISTING_TYPE[input.category] ?? 'itsepoiminta';

  if (input.capacity !== undefined) {
    // Guard against negative capacity — see the identical comment in
    // createFarmListing above for why this is necessary.
    //
    // Защита от отрицательной ёмкости — см. идентичный комментарий в
    // createFarmListing выше о том, почему это необходимо.
    const newTotal = Math.max(0, Math.round(input.capacity));
    patch.spots_total = newTotal;

    // TEMP FIX (bug #4): capacity edits previously left spots_remaining
    // untouched, so it could exceed the new spots_total and violate the DB
    // check constraint "spots_valid" (spots_remaining <= spots_total).
    // Until real booking-based occupancy tracking exists, reset
    // spots_remaining to match the new total on every capacity edit.
    //
    // ВРЕМЕННОЕ ИСПРАВЛЕНИЕ (баг №4): при редактировании capacity поле
    // spots_remaining раньше не менялось и могло превысить новый
    // spots_total, нарушая ограничение БД "spots_valid"
    // (spots_remaining <= spots_total). До появления реального учёта
    // занятости через брони — сбрасываем spots_remaining до нового total
    // при каждом редактировании capacity.
    patch.spots_remaining = newTotal;
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