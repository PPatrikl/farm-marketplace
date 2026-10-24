// frontend/src/services/inbox.ts
//
// Data for the inbox ("Saapuneet") and the notification bell.
// Uses columns  in the database 
//   contacts.is_read          -> has the receiver read the message?
//   bookings.farmer_read_at   -> has the farmer seen the booking? (null = no)
// The existing RLS policies make sure each user only sees their own items.

import { supabase } from '../supabaseClient';

export type InboxItem =
  | {
      kind: 'message';
      id: string;
      createdAt: string;
      read: boolean;
      fromName: string;
      fromEmail: string | null;
      text: string;
      listingTitle: string;
      listingLink: string | null;
    }
  | {
      kind: 'booking';
      id: string;
      createdAt: string;
      read: boolean;
      fromName: string;
      text: string | null;
      listingTitle: string;
      listingLink: string;
      bookingDate: string;
      partySize: number;
      status: string;
    };

/** All received messages + bookings on my farm listings, newest first. */
export async function fetchInbox(userId: string): Promise<InboxItem[]> {
  const [msgRes, bookRes] = await Promise.all([
    supabase
      .from('contacts')
      .select(
        'id, created_at, is_read, sender_name, sender_email, message, farm_listing_id, forest_listing_id, ' +
        'farm_listings(title), forest_listings(product_name)'
      )
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      // !inner = only bookings whose listing matches the filter below (= my listings)
      .select(
        'id, created_at, farmer_read_at, booking_date, party_size, message, status, listing_id, ' +
        'farm_listings!inner(title, owner_id), booker:profiles!bookings_booker_id_fkey(full_name)'
      )
      .eq('farm_listings.owner_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (msgRes.error) throw msgRes.error;
  if (bookRes.error) throw bookRes.error;

  const messages: InboxItem[] = (msgRes.data ?? []).map((r: any) => ({
    kind: 'message',
    id: r.id,
    createdAt: r.created_at,
    read: Boolean(r.is_read),
    fromName: r.sender_name || '—',
    fromEmail: r.sender_email ?? null,
    text: r.message,
    listingTitle: r.farm_listings?.title ?? r.forest_listings?.product_name ?? '—',
    listingLink: r.farm_listing_id
      ? `/tilaluettelo/${r.farm_listing_id}`
      : r.forest_listing_id
        ? `/metsatori/${r.forest_listing_id}`
        : null,
  }));

  const bookings: InboxItem[] = (bookRes.data ?? []).map((r: any) => ({
    kind: 'booking',
    id: r.id,
    createdAt: r.created_at,
    read: r.farmer_read_at != null,
    fromName: r.booker?.full_name || '—',
    text: r.message ?? null,
    listingTitle: r.farm_listings?.title ?? '—',
    listingLink: `/tilaluettelo/${r.listing_id}`,
    bookingDate: r.booking_date,
    partySize: r.party_size ?? 1,
    status: r.status,
  }));

  return [...messages, ...bookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Mark one item as read. */
export async function markRead(item: InboxItem): Promise<void> {
  const { error } =
    item.kind === 'message'
      ? await supabase.from('contacts').update({ is_read: true }).eq('id', item.id)
      : await supabase.from('bookings').update({ farmer_read_at: new Date().toISOString() }).eq('id', item.id);
  if (error) throw error;
}

/** Number of unread messages + bookings, for the bell. Returns 0 on errors. */
export async function countUnread(userId: string): Promise<number> {
  const [msgRes, bookRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true }) // head: count only, no rows transferred
      .eq('receiver_id', userId)
      .eq('is_read', false),
    supabase
      .from('bookings')
      .select('id, farm_listings!inner(owner_id)', { count: 'exact', head: true })
      .eq('farm_listings.owner_id', userId)
      .is('farmer_read_at', null),
  ]);

  if (msgRes.error) console.error('[inbox] unread messages:', msgRes.error.message);
  if (bookRes.error) console.error('[inbox] unread bookings:', bookRes.error.message);

  return (msgRes.count ?? 0) + (bookRes.count ?? 0);
}