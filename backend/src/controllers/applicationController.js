const pool = require('../config/db');
const { saveApplication } = require('../services/applicationStore');

function isDuplicateDbError(error) {
  return error && (error.code === '23505' || (error.message || '').includes('applications_listing_id_applicant_id_key'));
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
};
