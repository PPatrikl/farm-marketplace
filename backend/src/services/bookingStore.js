const fs = require('fs');
const path = require('path');

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
};
