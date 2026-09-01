// Batched lookup of host (owner) verification flags for a set of listings.
// Kept separate from mappers.ts because it's the only piece here that
// touches Supabase directly, distinct from pure data-shaping logic

import { supabase } from '../../supabaseClient';

export interface OwnerVerification {
  phone_verified: boolean;
  identity_verified: boolean;
}

export const DEFAULT_VERIFICATION: OwnerVerification = {
  phone_verified: false,
  identity_verified: false,
};

export async function fetchOwnerVerification(
  ownerIds: (string | undefined)[]
): Promise<Map<string, OwnerVerification>> {
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