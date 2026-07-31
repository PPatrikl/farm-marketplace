const pool = require('../config/db');
const { saveBooking } = require('../services/bookingStore');

async function createBooking(req, res, next) {
  try {
    const { listing_id, booker_id, status, booking_date, party_size, message } = req.body;

    if (!listing_id || !booking_date || !party_size) {
      return res.status(400).json({ error: 'listing_id, booking_date and party_size are required' });
    }

    try {
      const result = await pool.query(
        `
          INSERT INTO bookings (listing_id, booker_id, status, booking_date, party_size, message)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [listing_id, booker_id ?? null, status || 'pending', booking_date, party_size, message ?? null]
      );

      return res.status(201).json({ success: true, bookingId: result.rows[0].id, stored: 'database' });
    } catch (dbError) {
      console.warn('Database booking failed, falling back to local store', dbError.message);
      const saved = await saveBooking({
        listing_id,
        booker_id: booker_id ?? null,
        status: status || 'pending',
        booking_date,
        party_size,
        message: message ?? null,
      });

      return res.status(201).json({ success: true, bookingId: saved.id, stored: 'local-file' });
    }
  } catch (error) {
    console.error('Booking insert failed', error);
    return next(error);
  }
}

module.exports = {
  createBooking,
};
