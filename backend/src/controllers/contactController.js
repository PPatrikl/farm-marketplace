const pool = require('../config/db');
const { saveContactMessage } = require('../services/contactStore');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createContact(req, res, next) {
  try {
    const {
      forest_listing_id,
      farm_listing_id,
      seller_id,
      name,
      email,
      message,
      website, // honeypot
    } = req.body;

    // Honeypot: боты обычно заполняют скрытое поле
    if (website && website.trim() !== '') {
      // Не подсказываем боту, что его спалили
      return res.status(200).json({ success: true });
    }

    const errors = {};
    if (!name?.trim()) errors.name = 'Name is required';
    if (!email?.trim() || !isValidEmail(email)) errors.email = 'Invalid email';
    if (!message?.trim() || message.trim().length < 10) errors.message = 'Message too short';
    if (!forest_listing_id && !farm_listing_id) errors.listing = 'listing id is required';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const formattedMessage = `Lähettäjä / Sender: ${name.trim()} (${email.trim()})\n\n${message.trim()}`;

    try {
      const result = await pool.query(
        `
        INSERT INTO contacts (forest_listing_id, farm_listing_id, receiver_id, message, is_read)
        VALUES ($1, $2, $3, $4, false)
        RETURNING id
        `,
        [forest_listing_id || null, farm_listing_id || null, seller_id || null, formattedMessage]
      );

      return res.status(201).json({ success: true, contactId: result.rows[0].id, stored: 'database' });
    } catch (dbError) {
      console.warn('Database contact insert failed, falling back to local store', dbError.message);

      try {
        const saved = await saveContactMessage({
          forest_listing_id: forest_listing_id || null,
          farm_listing_id: farm_listing_id || null,
          receiver_id: seller_id || null,
          message: formattedMessage,
          is_read: false,
        });

        return res.status(201).json({ success: true, contactId: saved.id, stored: 'local-file' });
      } catch (fileError) {
        console.error('Contact insert failed', fileError);
        return next(fileError);
      }
    }
  } catch (error) {
    console.error('Contact insert failed', error);
    return next(error);
  }
}

module.exports = {
  createContact,
};