const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { saveBooking } = require('../src/services/bookingStore');

test('saveBooking writes a booking to a JSON file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookings-'));
  const filePath = path.join(tempDir, 'bookings.json');

  const booking = {
    listing_id: '607e04c0-6e67-48bc-abfa-1368491e8095',
    booking_date: '2027-06-23',
    party_size: 2,
    message: 'test',
  };

  const saved = await saveBooking(booking, { filePath });

  assert.equal(saved.listing_id, booking.listing_id);
  const stored = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(stored[0].listing_id, booking.listing_id);
});
