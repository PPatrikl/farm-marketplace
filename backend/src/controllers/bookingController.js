const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { saveBooking } = require('../services/bookingStore');

function getBookingsFilePath() {
  return path.join(__dirname, '..', '..', 'data', 'bookings.json');
}

function readBookings() {
  const filePath = getBookingsFilePath();
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeBookings(bookings) {
  fs.writeFileSync(getBookingsFilePath(), JSON.stringify(bookings, null, 2));
}

function isLocalBookingId(id) {
  return /^\d+-[0-9a-f]+$/i.test(String(id));
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));
}

function getBookingDateKey(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function getConfirmedPartySize(client, listingId, bookingDate, excludedBookingId = null) {
  const result = await client.query(
    `
      SELECT COALESCE(SUM(party_size), 0)::integer AS booked_count
      FROM bookings
      WHERE listing_id = $1
        AND booking_date = $2
        AND status = 'confirmed'
        AND ($3::text IS NULL OR id::text <> $3)
    `,
    [listingId, bookingDate, excludedBookingId == null ? null : String(excludedBookingId)]
  );
  const databaseCount = Number(result.rows[0]?.booked_count || 0);
  const localCount = readBookings()
    .filter((booking) => String(booking.listing_id) === String(listingId)
      && getBookingDateKey(booking.booking_date) === getBookingDateKey(bookingDate)
      && booking.status === 'confirmed'
      && String(booking.id) !== String(excludedBookingId))
    .reduce((total, booking) => total + Number(booking.party_size || 0), 0);
  return databaseCount + localCount;
}

async function getBookingAvailability(req, res, next) {
  try {
    const { listing_id } = req.query;
    if (!listing_id || !isUuid(listing_id)) {
      return res.status(400).json({ error: 'A valid listing_id is required' });
    }

    const listingResult = await pool.query(
      'SELECT spots_total FROM farm_listings WHERE id = $1 AND type = $2',
      [listing_id, 'itsepoiminta']
    );
    const listing = listingResult.rows[0];
    if (!listing) return res.status(404).json({ error: 'Picking listing not found' });

    const result = await pool.query(
      `
        SELECT booking_date, COALESCE(SUM(party_size), 0)::integer AS booked_count
        FROM bookings
        WHERE listing_id = $1 AND status = 'confirmed'
        GROUP BY booking_date
      `,
      [listing_id]
    );
    const bookedByDate = new Map(
      result.rows.map((row) => [getBookingDateKey(row.booking_date), Number(row.booked_count)])
    );
    for (const booking of readBookings()) {
      if (String(booking.listing_id) !== String(listing_id) || booking.status !== 'confirmed') continue;
      const date = getBookingDateKey(booking.booking_date);
      bookedByDate.set(date, (bookedByDate.get(date) || 0) + Number(booking.party_size || 0));
    }

    return res.status(200).json({
      capacity: listing.spots_total === null ? null : Number(listing.spots_total),
      bookedByDate: Object.fromEntries(bookedByDate),
    });
  } catch (error) {
    return next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const { listing_ids, booker_id } = req.query;
    const listingIds = new Set(
      listing_ids ? listing_ids.split(',').map((value) => value.trim()).filter(Boolean) : []
    );
    if (listingIds.size === 0 && !booker_id) {
      return res.status(400).json({ error: 'listing_ids or booker_id is required' });
    }

    const conditions = [];
    const values = [];
    if (listingIds.size > 0) {
      values.push(Array.from(listingIds));
      conditions.push(`b.listing_id = ANY($${values.length}::uuid[])`);
    }
    if (booker_id) {
      values.push(booker_id);
      conditions.push(`b.booker_id = $${values.length}`);
    }

    let databaseBookings = [];
    let archivedDatabaseKeys = new Set();
    try {
      const result = await pool.query(
        `
          SELECT b.id, b.listing_id, b.booker_id, b.status, b.booking_date,
                 b.party_size, b.message, b.rejection_reason,
                 b.farmer_archived_at, b.booker_archived_at,
                 b.created_at AS "createdAt", fl.title AS listing_title
          FROM bookings b
          JOIN farm_listings fl ON fl.id = b.listing_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY b.created_at DESC
        `,
        values
      );
      const archivedColumn = booker_id ? 'booker_archived_at' : 'farmer_archived_at';
      archivedDatabaseKeys = new Set(
        result.rows
          .filter((booking) => booking[archivedColumn])
          .map((booking) => `${booking.listing_id}:${booking.booker_id}`)
      );
      databaseBookings = result.rows.filter((booking) => !booking[archivedColumn]);
    } catch (dbError) {
      console.warn('Database booking query failed, falling back to local store', dbError.message);
    }

    const localBookings = readBookings().filter((booking) => (
      (listingIds.size === 0 || listingIds.has(String(booking.listing_id)))
      && (!booker_id || String(booking.booker_id) === String(booker_id))
      && (!booker_id || !booking.booker_archived_at)
      && (booker_id || !booking.farmer_archived_at)
      && !archivedDatabaseKeys.has(`${booking.listing_id}:${booking.booker_id}`)
    ));
    const bookingsById = new Map();
    for (const booking of [...localBookings, ...databaseBookings]) {
      bookingsById.set(String(booking.id), booking);
    }

    return res.status(200).json({
      bookings: Array.from(bookingsById.values())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    });
  } catch (error) {
    return next(error);
  }
}

async function archiveBooking(req, res, next) {
  try {
    const { booking_id } = req.params;
    const { user_id } = req.body;
    if (!booking_id || !user_id) {
      return res.status(400).json({ error: 'booking_id and user_id are required' });
    }

    if (isLocalBookingId(booking_id)) {
      const bookings = readBookings();
      const booking = bookings.find((item) => String(item.id) === String(booking_id));
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      const listingResult = await pool.query('SELECT owner_id FROM farm_listings WHERE id = $1', [booking.listing_id]);
      const processed = ['confirmed', 'cancelled'].includes(booking.status);
      const isFarmer = String(listingResult.rows[0]?.owner_id) === String(user_id) && processed;
      const isBooker = String(booking.booker_id) === String(user_id) && processed;
      if (!isFarmer && !isBooker) return res.status(404).json({ error: 'Booking not found' });
      if (isFarmer) booking.farmer_archived_at = new Date().toISOString();
      if (isBooker) booking.booker_archived_at = new Date().toISOString();
      writeBookings(bookings);
      return res.status(200).json({ success: true });
    }
    if (!isUuid(booking_id)) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const result = await pool.query(
      `
        UPDATE bookings b
        SET farmer_archived_at = CASE
              WHEN fl.owner_id = $2 AND b.status IN ('confirmed', 'cancelled') THEN NOW()
              ELSE b.farmer_archived_at
            END,
            booker_archived_at = CASE
              WHEN b.booker_id = $2 AND b.status IN ('confirmed', 'cancelled') THEN NOW()
              ELSE b.booker_archived_at
            END
        FROM farm_listings fl
        WHERE b.id = $1
          AND fl.id = b.listing_id
          AND b.status IN ('confirmed', 'cancelled')
          AND (fl.owner_id = $2 OR b.booker_id = $2)
        RETURNING b.id
      `,
      [booking_id, user_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Booking not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const { listing_id, booker_id, status, booking_date, party_size, message } = req.body;

    if (!listing_id || !booker_id || !booking_date || !Number.isInteger(Number(party_size)) || Number(party_size) < 1) {
      return res.status(400).json({ error: 'listing_id, booker_id, booking_date and a positive party_size are required' });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const listingResult = await client.query(
        'SELECT spots_total FROM farm_listings WHERE id = $1 AND type = $2 FOR UPDATE',
        [listing_id, 'itsepoiminta']
      );
      const listing = listingResult.rows[0];
      if (!listing) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Picking listing not found' });
      }
      const bookedCount = await getConfirmedPartySize(client, listing_id, booking_date);
      if (listing.spots_total !== null
          && bookedCount + Number(party_size) > Number(listing.spots_total)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Not enough places remain for this date' });
      }

      const result = await client.query(
        `
          INSERT INTO bookings (listing_id, booker_id, status, booking_date, party_size, message)
          VALUES ($1, $2, 'pending', $3, $4, $5)
          RETURNING id
        `,
        [listing_id, booker_id, booking_date, Number(party_size), message ?? null]
      );
      await client.query('COMMIT');
      return res.status(201).json({ success: true, bookingId: result.rows[0].id, stored: 'database' });
    } catch (dbError) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch (rollbackError) {
          console.error('Failed to roll back booking creation:', rollbackError.message);
        }
      }
      console.warn('Database booking failed, falling back to local store', dbError.message);
      const saved = await saveBooking({
        listing_id,
        booker_id,
        status: 'pending',
        booking_date,
        party_size: Number(party_size),
        message: message ?? null,
      });

      return res.status(201).json({ success: true, bookingId: saved.id, stored: 'local-file' });
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    console.error('Booking insert failed', error);
    return next(error);
  }
}

async function markBookingRead(req, res, next) {
  try {
    const { booking_id, user_id } = req.body;
    if (!booking_id || !user_id) {
      return res.status(400).json({ error: 'booking_id and user_id are required' });
    }

    if (isLocalBookingId(booking_id)) {
      const bookings = readBookings();
      const booking = bookings.find((item) => String(item.id) === String(booking_id));
      if (!booking) return res.status(404).json({ error: 'Notification not found' });
      const listingResult = await pool.query('SELECT owner_id FROM farm_listings WHERE id = $1', [booking.listing_id]);
      const isFarmer = String(listingResult.rows[0]?.owner_id) === String(user_id) && booking.status === 'pending';
      const isBooker = String(booking.booker_id) === String(user_id) && ['confirmed', 'cancelled'].includes(booking.status);
      if (!isFarmer && !isBooker) return res.status(404).json({ error: 'Notification not found' });
      if (isFarmer) booking.farmer_read_at = new Date().toISOString();
      if (isBooker) booking.booker_read_at = new Date().toISOString();
      writeBookings(bookings);
      return res.status(200).json({ success: true });
    }

    const result = await pool.query(
      `
        UPDATE bookings b
        SET farmer_read_at = CASE
              WHEN fl.owner_id = $2 AND b.status = 'pending' THEN NOW()
              ELSE b.farmer_read_at
            END,
            booker_read_at = CASE
              WHEN b.booker_id = $2 AND b.status IN ('confirmed', 'cancelled') THEN NOW()
              ELSE b.booker_read_at
            END
        FROM farm_listings fl
        WHERE b.id = $1
          AND fl.id = b.listing_id
          AND (fl.owner_id = $2 OR b.booker_id = $2)
        RETURNING b.id
      `,
      [booking_id, user_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function decideBooking(req, res, next) {
  const { booking_id } = req.params;
  const { farmer_id, status, rejection_reason } = req.body;
  if (!farmer_id || !['confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'farmer_id and a valid status are required' });
  }
  if (status === 'cancelled' && rejection_reason != null && typeof rejection_reason !== 'string') {
    return res.status(400).json({ error: 'rejection_reason must be a string' });
  }

  if (isLocalBookingId(booking_id)) {
    const client = await pool.connect();
    let originalFileContent;
    let localFileUpdated = false;
    try {
      await client.query('BEGIN');
      const bookings = readBookings();
      const booking = bookings.find((item) => String(item.id) === String(booking_id));
      if (!booking) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Booking not found' });
      }
      const listingResult = await client.query(
        'SELECT owner_id, spots_total FROM farm_listings WHERE id = $1 FOR UPDATE',
        [booking.listing_id]
      );
      const listing = listingResult.rows[0];
      if (!listing || String(listing.owner_id) !== String(farmer_id)) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Booking not found' });
      }
      if (booking.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Booking has already been reviewed' });
      }
      const bookedCount = status === 'confirmed'
        ? await getConfirmedPartySize(client, booking.listing_id, booking.booking_date, booking.id)
        : 0;
      if (status === 'confirmed' && listing.spots_total !== null
          && bookedCount + Number(booking.party_size) > Number(listing.spots_total)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Not enough places remain for this date' });
      }

      const filePath = getBookingsFilePath();
      originalFileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
      booking.status = status;
      booking.rejection_reason = status === 'cancelled' ? (rejection_reason || '').trim() || null : null;
      booking.booker_read_at = null;
      writeBookings(bookings);
      localFileUpdated = true;

      await client.query('COMMIT');
      return res.status(200).json({ success: true, booking: { ...booking }, spotsRemaining: listing.spots_total === null
        ? null
        : Number(listing.spots_total) - bookedCount - (status === 'confirmed' ? Number(booking.party_size) : 0) });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (rollbackError) {
        console.error('Failed to roll back local booking decision:', rollbackError.message);
      }
      if (localFileUpdated) {
        try {
          if (originalFileContent === null) fs.rmSync(getBookingsFilePath(), { force: true });
          else fs.writeFileSync(getBookingsFilePath(), originalFileContent);
        } catch (restoreError) {
          console.error('Failed to restore local bookings file:', restoreError.message);
        }
      }
      return next(error);
    } finally {
      client.release();
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        SELECT b.id, b.listing_id, b.booker_id, b.status, b.booking_date,
               b.party_size, fl.owner_id, fl.spots_total
        FROM bookings b
        JOIN farm_listings fl ON fl.id = b.listing_id
        WHERE b.id = $1
        FOR UPDATE OF b, fl
      `,
      [booking_id]
    );
    const booking = result.rows[0];
    if (!booking || String(booking.owner_id) !== String(farmer_id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Booking has already been reviewed' });
    }
    const bookedCount = status === 'confirmed'
      ? await getConfirmedPartySize(client, booking.listing_id, booking.booking_date, booking.id)
      : 0;
    if (status === 'confirmed' && booking.spots_total !== null
        && bookedCount + Number(booking.party_size) > Number(booking.spots_total)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Not enough places remain for this date' });
    }
    const updated = await client.query(
      `
        UPDATE bookings
        SET status = $2, rejection_reason = $3, booker_read_at = NULL
        WHERE id = $1
        RETURNING id, listing_id, booker_id, status, booking_date, party_size, rejection_reason
      `,
      [booking_id, status, status === 'cancelled' ? (rejection_reason || '').trim() || null : null]
    );
    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      booking: updated.rows[0],
      spotsRemaining: booking.spots_total === null
        ? null
        : Number(booking.spots_total) - bookedCount - (status === 'confirmed' ? Number(booking.party_size) : 0),
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) {
      console.error('Failed to roll back booking decision:', rollbackError.message);
    }
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  getBookingAvailability,
  listBookings,
  archiveBooking,
  markBookingRead,
  decideBooking,
};
