ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS farmer_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applicant_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS farmer_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applicant_archived_at TIMESTAMPTZ;

UPDATE applications
SET farmer_read_at = COALESCE(farmer_read_at, created_at),
    applicant_read_at = CASE
      WHEN status IN ('accepted', 'rejected') THEN COALESCE(applicant_read_at, created_at)
      ELSE applicant_read_at
    END;

CREATE INDEX IF NOT EXISTS applications_applicant_status_idx
  ON applications (applicant_id, status);

CREATE INDEX IF NOT EXISTS applications_listing_status_idx
  ON applications (listing_id, status);
