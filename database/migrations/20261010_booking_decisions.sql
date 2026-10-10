ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS farmer_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booker_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS farmer_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booker_archived_at TIMESTAMPTZ;

UPDATE bookings
SET farmer_read_at = COALESCE(farmer_read_at, created_at),
    booker_read_at = CASE
      WHEN status IN ('confirmed', 'cancelled') THEN COALESCE(booker_read_at, created_at)
      ELSE booker_read_at
    END;

CREATE INDEX IF NOT EXISTS bookings_booker_status_idx
  ON bookings (booker_id, status);

CREATE INDEX IF NOT EXISTS bookings_listing_status_idx
  ON bookings (listing_id, status);
