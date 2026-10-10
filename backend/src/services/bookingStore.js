const fs = require('fs');
const path = require('path');

function readBookingsForNotifications(options = {}) {
  const filePath = options.filePath || path.join(__dirname, '..', '..', 'data', 'bookings.json');
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function saveBooking(booking, options = {}) {
  const filePath = options.filePath || path.join(__dirname, '..', '..', 'data', 'bookings.json');
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let bookings = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.trim()) {
      bookings = JSON.parse(raw);
    }
  }

  const savedBooking = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...booking,
    createdAt: new Date().toISOString(),
  };

  bookings.push(savedBooking);
  fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));
  return savedBooking;
}

module.exports = {
  saveBooking,
  readBookingsForNotifications,
};
