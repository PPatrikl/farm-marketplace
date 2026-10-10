const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { saveApplication } = require('../services/applicationStore');
const { readBookingsForNotifications } = require('../services/bookingStore');

function getApplicationsFilePath() {
  return path.join(__dirname, '..', '..', 'data', 'applications.json');
}

function readApplications() {
  const filePath = getApplicationsFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse applications file', error.message);
    return [];
  }
}

function isLocalApplicationId(id) {
  return /^\d+-[0-9a-f]+$/i.test(String(id));
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));
}

function writeApplications(applications) {
  fs.writeFileSync(getApplicationsFilePath(), JSON.stringify(applications, null, 2));
}

function isDuplicateDbError(error) {
  return error && (error.code === '23505' || (error.message || '').includes('applications_listing_id_applicant_id_key'));
}

async function listApplications(req, res, next) {
  try {
    const { listing_id, listing_ids, applicant_id } = req.query;
    const wantedListingIds = new Set();
    const conditions = [];
    const values = [];

    if (listing_id) wantedListingIds.add(String(listing_id));
    if (listing_ids) {
      listing_ids.split(',').map((value) => value.trim()).filter(Boolean).forEach((value) => wantedListingIds.add(value));
    }

    if (wantedListingIds.size === 0 && !applicant_id) {
      return res.status(400).json({ error: 'listing_id, listing_ids or applicant_id is required' });
    }

    if (wantedListingIds.size > 0) {
      values.push(Array.from(wantedListingIds));
      conditions.push(`listing_id = ANY($${values.length}::uuid[])`);
    }

    if (applicant_id) {
      values.push(String(applicant_id));
      conditions.push(`applicant_id = $${values.length}`);
    }

    let databaseApplications = [];
    let archivedDatabaseKeys = new Set();
    try {
      const result = await pool.query(
        `
          SELECT a.id, a.listing_id, a.applicant_id, a.status, a.message,
                 a.rejection_reason, a.created_at AS "createdAt",
                 a.farmer_archived_at, a.applicant_archived_at,
                 fl.title AS listing_title, fl.date_start, fl.date_end
          FROM applications a
          LEFT JOIN farm_listings fl ON fl.id = a.listing_id
          ${conditions.length > 0 ? `WHERE ${conditions.map((condition) => condition.replace(/\b(listing_id|applicant_id)\b/g, 'a.$1')).join(' AND ')}` : ''}
          ORDER BY a.created_at DESC
        `,
        values
      );
      const archivedColumn = applicant_id ? 'applicant_archived_at' : 'farmer_archived_at';
      archivedDatabaseKeys = new Set(
        result.rows
          .filter((application) => application[archivedColumn])
          .map((application) => `${application.listing_id}:${application.applicant_id}`)
      );
      databaseApplications = result.rows.filter((application) => !application[archivedColumn]);
    } catch (dbError) {
      console.warn('Database application query failed, falling back to local store', dbError.message);
    }

    const localApplications = readApplications().filter((application) => {
      if (wantedListingIds.size > 0 && !wantedListingIds.has(String(application.listing_id))) {
        return false;
      }

      if (applicant_id && String(application.applicant_id) !== String(applicant_id)) {
        return false;
      }

      if (applicant_id && application.applicant_archived_at) return false;
      if (wantedListingIds.size > 0 && !applicant_id && application.farmer_archived_at) return false;
      if (archivedDatabaseKeys.has(`${application.listing_id}:${application.applicant_id}`)) return false;
      return true;
    });

    const applicationsByApplicant = new Map();
    for (const application of [...localApplications, ...databaseApplications]) {
      const key = `${application.listing_id}:${application.applicant_id}`;
      applicationsByApplicant.set(key, application);
    }

    const applications = Array.from(applicationsByApplicant.values())
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.status(200).json({ applications });
  } catch (error) {
    return next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const localApplications = readApplications();
    const localListingIds = Array.from(new Set(
      [
        ...localApplications
          .filter((application) => String(application.applicant_id) === String(user_id)
            || application.status === 'pending')
          .map((application) => String(application.listing_id)),
        ...readBookingsForNotifications()
          .filter((booking) => String(booking.booker_id) === String(user_id)
            || booking.status === 'pending')
          .map((booking) => String(booking.listing_id)),
      ]
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    ));

    const [result, bookingsResult, listingsResult] = await Promise.all([
      pool.query(
      `
        SELECT a.id, a.listing_id, a.applicant_id, a.status, a.rejection_reason,
               a.created_at AS "createdAt", a.farmer_read_at, a.applicant_read_at,
               a.farmer_archived_at, a.applicant_archived_at,
               fl.title AS listing_title, fl.owner_id,
               CASE
                 WHEN fl.owner_id = $1 THEN 'application'
                 ELSE 'application_status'
               END AS kind,
               CASE
                 WHEN fl.owner_id = $1 THEN a.farmer_read_at IS NULL
                 ELSE a.applicant_read_at IS NULL
               END AS unread
        FROM applications a
        JOIN farm_listings fl ON fl.id = a.listing_id
        WHERE (fl.owner_id = $1 AND a.applicant_id <> $1 AND a.status = 'pending')
           OR (a.applicant_id = $1 AND fl.owner_id <> $1 AND a.status IN ('accepted', 'rejected'))
        ORDER BY a.created_at DESC
        LIMIT 50
      `,
      [user_id]
      ),
      pool.query(
        `
          SELECT b.id, b.listing_id, b.booker_id, b.status, b.rejection_reason,
                 b.booking_date, b.party_size, b.created_at AS "createdAt",
                 b.farmer_read_at, b.booker_read_at, b.farmer_archived_at, b.booker_archived_at,
                 fl.title AS listing_title, fl.owner_id,
                 CASE
                   WHEN fl.owner_id = $1 THEN 'booking'
                   ELSE 'booking_status'
                 END AS kind,
                 CASE
                   WHEN fl.owner_id = $1 THEN b.farmer_read_at IS NULL
                   ELSE b.booker_read_at IS NULL
                 END AS unread
          FROM bookings b
          JOIN farm_listings fl ON fl.id = b.listing_id
          WHERE (fl.owner_id = $1 AND b.booker_id <> $1 AND b.status = 'pending')
             OR (b.booker_id = $1 AND fl.owner_id <> $1 AND b.status IN ('confirmed', 'cancelled'))
          ORDER BY b.created_at DESC
          LIMIT 50
        `,
        [user_id]
      ),
      pool.query(
        'SELECT id, title, owner_id FROM farm_listings WHERE owner_id = $1 OR id::text = ANY($2::text[])',
        [user_id, localListingIds]
      ),
    ]);

    const ownedListingIds = new Set(
      listingsResult.rows
        .filter((listing) => String(listing.owner_id) === String(user_id))
        .map((listing) => String(listing.id))
    );
    const databaseKeys = new Set(result.rows.map((application) =>
      `${application.listing_id}:${application.applicant_id}:${application.kind === 'application' ? 'farmer' : 'applicant'}`
    ));
    const localNotifications = localApplications
      .filter((application) => (
        (ownedListingIds.has(String(application.listing_id))
          && String(application.applicant_id) !== String(user_id)
          && application.status === 'pending'
          && !application.farmer_archived_at)
        || (String(application.applicant_id) === String(user_id)
          && !ownedListingIds.has(String(application.listing_id))
          && ['accepted', 'rejected'].includes(application.status)
          && !application.applicant_archived_at)
      ))
      .filter((application) => {
        const role = ownedListingIds.has(String(application.listing_id))
          ? 'farmer'
          : 'applicant';
        return !databaseKeys.has(`${application.listing_id}:${application.applicant_id}:${role}`);
      })
      .map((application) => {
        const isFarmer = ownedListingIds.has(String(application.listing_id));
        const listing = listingsResult.rows.find((row) => String(row.id) === String(application.listing_id));
        return {
          id: application.id,
          listing_id: application.listing_id,
          status: application.status,
          rejection_reason: application.rejection_reason || null,
          createdAt: application.createdAt,
          farmer_read_at: application.farmer_read_at || null,
          applicant_read_at: application.applicant_read_at || null,
          listing_title: listing?.title || null,
          kind: isFarmer ? 'application' : 'application_status',
          unread: isFarmer ? !application.farmer_read_at : !application.applicant_read_at,
        };
      });

    const localBookings = readBookingsForNotifications()
      .filter((booking) => (
      (ownedListingIds.has(String(booking.listing_id))
        && String(booking.booker_id) !== String(user_id)
        && booking.status === 'pending'
        && !booking.farmer_archived_at)
      || (String(booking.booker_id) === String(user_id)
        && !ownedListingIds.has(String(booking.listing_id))
        && ['confirmed', 'cancelled'].includes(booking.status)
        && !booking.booker_archived_at)
      ))
      .map((booking) => {
      const isFarmer = ownedListingIds.has(String(booking.listing_id));
      const listing = listingsResult.rows.find((row) => String(row.id) === String(booking.listing_id));
      return {
        id: booking.id,
        booking_id: booking.id,
        listing_id: booking.listing_id,
        status: booking.status,
        rejection_reason: booking.rejection_reason || null,
        booking_date: booking.booking_date,
        party_size: booking.party_size,
        createdAt: booking.createdAt,
        listing_title: listing?.title || null,
        kind: isFarmer ? 'booking' : 'booking_status',
        unread: isFarmer ? !booking.farmer_read_at : !booking.booker_read_at,
      };
      });
    const databaseBookingKeys = new Set(bookingsResult.rows.map((booking) =>
      `${booking.listing_id}:${booking.booker_id}:${booking.kind === 'booking' ? 'farmer' : 'booker'}`
    ));
    const filteredLocalBookings = localBookings.filter((booking) => {
      const role = ownedListingIds.has(String(booking.listing_id)) ? 'farmer' : 'booker';
      return !databaseBookingKeys.has(`${booking.listing_id}:${booking.booker_id}:${role}`);
    });

    return res.status(200).json({
      notifications: [...result.rows, ...localNotifications, ...bookingsResult.rows, ...filteredLocalBookings]
      .filter((notification) => notification.unread
        && !(notification.kind === 'application'
          ? notification.farmer_archived_at
          : notification.kind === 'application_status'
            ? notification.applicant_archived_at
            : notification.kind === 'booking'
              ? notification.farmer_archived_at
              : notification.booker_archived_at))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 50),
    });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { application_id, user_id } = req.body;
    if (!application_id || !user_id) {
      return res.status(400).json({ error: 'application_id and user_id are required' });
    }

    if (isLocalApplicationId(application_id)) {
      const applications = readApplications();
      const application = applications.find((item) => String(item.id) === String(application_id));
      if (!application) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const listingResult = await pool.query(
        'SELECT owner_id FROM farm_listings WHERE id = $1',
        [application.listing_id]
      );
      const isFarmer = String(listingResult.rows[0]?.owner_id) === String(user_id)
        && application.status === 'pending';
      const isApplicant = String(application.applicant_id) === String(user_id)
        && ['accepted', 'rejected'].includes(application.status);
      if (!isFarmer && !isApplicant) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (isFarmer) application.farmer_read_at = new Date().toISOString();
      if (isApplicant) application.applicant_read_at = new Date().toISOString();
      writeApplications(applications);
      return res.status(200).json({ success: true });
    }
    if (!isUuid(application_id)) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const result = await pool.query(
      `
        UPDATE applications a
        SET farmer_read_at = CASE
              WHEN fl.owner_id = $2 AND a.status = 'pending' THEN NOW()
              ELSE a.farmer_read_at
            END,
            applicant_read_at = CASE
              WHEN a.applicant_id = $2 AND a.status IN ('accepted', 'rejected') THEN NOW()
              ELSE a.applicant_read_at
            END
        FROM farm_listings fl
        WHERE a.id = $1
          AND fl.id = a.listing_id
          AND (fl.owner_id = $2 OR a.applicant_id = $2)
        RETURNING a.id
      `,
      [application_id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function archiveApplication(req, res, next) {
  try {
    const { application_id } = req.params;
    const { user_id } = req.body;
    if (!application_id || !user_id) {
      return res.status(400).json({ error: 'application_id and user_id are required' });
    }

    if (isLocalApplicationId(application_id)) {
      const applications = readApplications();
      const application = applications.find((item) => String(item.id) === String(application_id));
      if (!application) return res.status(404).json({ error: 'Application not found' });

      const listingResult = await pool.query('SELECT owner_id FROM farm_listings WHERE id = $1', [application.listing_id]);
      const isFarmer = String(listingResult.rows[0]?.owner_id) === String(user_id)
        && ['accepted', 'rejected'].includes(application.status);
      const isApplicant = String(application.applicant_id) === String(user_id)
        && ['accepted', 'rejected'].includes(application.status);
      if (!isFarmer && !isApplicant) return res.status(404).json({ error: 'Application not found' });

      if (isFarmer) application.farmer_archived_at = new Date().toISOString();
      if (isApplicant) application.applicant_archived_at = new Date().toISOString();
      writeApplications(applications);
      return res.status(200).json({ success: true });
    }
    if (!isUuid(application_id)) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const result = await pool.query(
      `
        UPDATE applications a
        SET farmer_archived_at = CASE
              WHEN fl.owner_id = $2 AND a.status IN ('accepted', 'rejected') THEN NOW()
              ELSE a.farmer_archived_at
            END,
            applicant_archived_at = CASE
              WHEN a.applicant_id = $2 AND a.status IN ('accepted', 'rejected') THEN NOW()
              ELSE a.applicant_archived_at
            END
        FROM farm_listings fl
        WHERE a.id = $1
          AND fl.id = a.listing_id
          AND a.status IN ('accepted', 'rejected')
          AND (fl.owner_id = $2 OR a.applicant_id = $2)
        RETURNING a.id
      `,
      [application_id, user_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Application not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function decideApplication(req, res, next) {
  const { application_id } = req.params;
  const { farmer_id, status, rejection_reason } = req.body;
  if (!application_id || !farmer_id || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'application_id, farmer_id and a valid status are required' });
  }
  if (status === 'rejected' && rejection_reason != null && typeof rejection_reason !== 'string') {
    return res.status(400).json({ error: 'rejection_reason must be a string' });
  }

  if (isLocalApplicationId(application_id)) {
    const client = await pool.connect();
    let originalFileContent;
    let localFileUpdated = false;
    try {
      await client.query('BEGIN');
      const applications = readApplications();
      const application = applications.find((item) => String(item.id) === String(application_id));
      if (!application) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Application not found' });
      }

      const listingResult = await client.query(
        `
          SELECT owner_id, spots_remaining
          FROM farm_listings
          WHERE id = $1
          FOR UPDATE
        `,
        [application.listing_id]
      );
      const listing = listingResult.rows[0];
      if (!listing || String(listing.owner_id) !== String(farmer_id)) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Application not found' });
      }
      if (application.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Application has already been reviewed' });
      }
      if (status === 'accepted' && listing.spots_remaining !== null && Number(listing.spots_remaining) <= 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'No places remain for this listing' });
      }

      const filePath = getApplicationsFilePath();
      originalFileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
      application.status = status;
      application.rejection_reason = status === 'rejected' ? (rejection_reason || '').trim() || null : null;
      application.applicant_read_at = null;
      writeApplications(applications);
      localFileUpdated = true;

      if (status === 'accepted' && listing.spots_remaining !== null) {
        await client.query(
          'UPDATE farm_listings SET spots_remaining = spots_remaining - 1 WHERE id = $1',
          [application.listing_id]
        );
      }

      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        application: {
          id: application.id,
          listing_id: application.listing_id,
          applicant_id: application.applicant_id,
          status: application.status,
          rejection_reason: application.rejection_reason,
        },
        spotsRemaining: listing.spots_remaining === null
          ? null
          : Number(listing.spots_remaining) - (status === 'accepted' ? 1 : 0),
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back local application decision:', rollbackError.message);
      }
      if (localFileUpdated) {
        try {
          if (originalFileContent === null) {
            fs.rmSync(getApplicationsFilePath(), { force: true });
          } else {
            fs.writeFileSync(getApplicationsFilePath(), originalFileContent);
          }
        } catch (restoreError) {
          console.error('Failed to restore local applications file:', restoreError.message);
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
    const applicationResult = await client.query(
      `
        SELECT a.id, a.listing_id, a.applicant_id, a.status,
               fl.owner_id, fl.spots_remaining, fl.title
        FROM applications a
        JOIN farm_listings fl ON fl.id = a.listing_id
        WHERE a.id = $1
        FOR UPDATE OF a, fl
      `,
      [application_id]
    );

    const application = applicationResult.rows[0];
    if (!application || String(application.owner_id) !== String(farmer_id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    if (application.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Application has already been reviewed' });
    }

    if (status === 'accepted' && application.spots_remaining !== null && Number(application.spots_remaining) <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No places remain for this listing' });
    }

    if (status === 'accepted' && application.spots_remaining !== null) {
      await client.query(
        'UPDATE farm_listings SET spots_remaining = spots_remaining - 1 WHERE id = $1',
        [application.listing_id]
      );
    }

    const updated = await client.query(
      `
        UPDATE applications
        SET status = $2,
            rejection_reason = $3,
            applicant_read_at = NULL
        WHERE id = $1
        RETURNING id, listing_id, applicant_id, status, rejection_reason
      `,
      [application_id, status, status === 'rejected' ? (rejection_reason || '').trim() || null : null]
    );

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      application: updated.rows[0],
      spotsRemaining: application.spots_remaining === null
        ? null
        : Number(application.spots_remaining) - (status === 'accepted' ? 1 : 0),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function createApplication(req, res, next) {
  try {
    const { listing_id, applicant_id, status, message } = req.body;

    if (!listing_id || !applicant_id) {
      return res.status(400).json({ error: 'listing_id and applicant_id are required' });
    }

    try {
      const result = await pool.query(
        `
          INSERT INTO applications (listing_id, applicant_id, status, message)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `,
        [listing_id, applicant_id, status || 'pending', message ?? null]
      );

      return res.status(201).json({ success: true, applicationId: result.rows[0].id, stored: 'database' });
    } catch (dbError) {
      if (isDuplicateDbError(dbError)) {
        return res.status(409).json({ error: 'You have already applied to this listing' });
      }

      console.warn('Database application insert failed, falling back to local store', dbError.message);

      try {
        const saved = await saveApplication({
          listing_id,
          applicant_id,
          status: status || 'pending',
          message: message ?? null,
        });

        return res.status(201).json({ success: true, applicationId: saved.id, stored: 'local-file' });
      } catch (fileError) {
        if (fileError.code === 'DUPLICATE_APPLICATION') {
          return res.status(409).json({ error: 'You have already applied to this listing' });
        }

        return next(fileError);
      }
    }
  } catch (error) {
    console.error('Application insert failed', error);
    return next(error);
  }
}

module.exports = {
  createApplication,
  listApplications,
  listNotifications,
  markNotificationRead,
  archiveApplication,
  decideApplication,
};
