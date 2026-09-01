// Pure data-shaping: turns a raw Supabase row (SupabaseFarmListing) into the
// FarmWithVerification shape the UI consumes. No Supabase calls of its own —
// verification and images are injected as already-fetched data, or fetched
// once in bulk by mapRowsToFarms to avoid N+1 queries.

import type { FarmWithVerification, SupabaseFarmListing } from '../types';
import { getEffectiveStatus } from '../types';
import { fetchOwnerVerification, DEFAULT_VERIFICATION, type OwnerVerification } from './verification';
import { fetchListingImages, type ListingImageRow } from './images';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=520&fit=crop&auto=format';

const UNIT_MAP: Record<string, string> = { kg: 'kg', h: 'h', day: 'pv', piece: 'kpl', litre: 'L' };

// Builds the fi/en amenity tag lists for a listing row. Picking listings show
// farm-level amenities (organic, accessible, etc.), job listings show
// job-specific perks (accommodation, meals, transport, etc.)

function buildTags(row: SupabaseFarmListing): { tags_fi: string[]; tags_en: string[] } {
  const isPicking = row.type === 'itsepoiminta';
  const tags_fi: string[] = [];
  const tags_en: string[] = [];

  if (isPicking) {
    if (row.is_organic)      { tags_fi.push('Luomu');           tags_en.push('Organic'); }
    if (row.is_accessible)   { tags_fi.push('Esteettömyys');    tags_en.push('Accessible'); }
    if (row.family_friendly) { tags_fi.push('Sopii perheille'); tags_en.push('Family-friendly'); }
    if (row.dogs_allowed)    { tags_fi.push('Koirat sallittu'); tags_en.push('Dogs allowed'); }
  } else {
    if (row.accommodation)   { tags_fi.push('Majoitus tarjolla');  tags_en.push('Housing provided'); }
    if (row.meals_included)  { tags_fi.push('Ateriat sisältyvät'); tags_en.push('Meals included'); }
    if (row.transport)       { tags_fi.push('Kuljetukset');        tags_en.push('Transport'); }
    if (row.meal_allowance)  { tags_fi.push('Ateria-avustus');     tags_en.push('Meal allowance'); }
    if (row.contract_based)  { tags_fi.push('Sopimuspohjainen');   tags_en.push('Contract work'); }
    if (row.machine_work)    { tags_fi.push('Konetyö');            tags_en.push('Machinery work'); }
  }

  return { tags_fi, tags_en };
}

export function mapToFarm(
  row: SupabaseFarmListing,
  verification: OwnerVerification,
  images: ListingImageRow[],
): FarmWithVerification {
  const isPicking = row.type === 'itsepoiminta';
  const { tags_fi, tags_en } = buildTags(row);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };

  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const primaryFromTable = sortedImages.find((i) => i.is_primary)?.url;
  const heroImage = primaryFromTable ?? row.primary_image_url ?? FALLBACK_IMAGE;
  const galleryImages = sortedImages.map((i) => i.url).filter((url) => url !== heroImage);

  return {
    id: row.id,
    name: row.farm_name,
    // Real listing title (Otsikko) from farm_listings.title.
    title: row.title,
    location_fi: `${row.farm_city}, ${row.farm_region}`,
    location_en: `${row.farm_city}, ${row.farm_region}`,
    city: row.farm_city,
    region_fi: row.farm_region,
    region_en: row.farm_region,
    type: isPicking ? 'picking' : 'job',
    // Empty string (not row.title) so the ListingDetail subtitle doesn't
    // duplicate the h1 title when crop_type is unset.
    produce_fi: row.crop_type ?? '',
    produce_en: row.crop_type ?? '',
    price: Number(row.price).toFixed(2),
    unit: UNIT_MAP[row.price_unit] ?? row.price_unit,
    dateStart: formatDate(row.date_start),
    dateEnd: formatDate(row.date_end),
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
  };
}

// Batch-maps a list of raw rows, fetching verification + images once for the
// whole batch instead of once per row (avoids N+1 queries).
//
// Пакетно преобразует список сырых строк, запрашивая верификацию и картинки
// один раз на всю пачку, а не по одному разу на строку (избегает N+1 запросов).
export async function mapRowsToFarms(rows: SupabaseFarmListing[]): Promise<FarmWithVerification[]> {
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