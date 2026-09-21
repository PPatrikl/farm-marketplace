const fs = require('fs');
const path = require('path');

function buildValidationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  return error;
}

async function saveContactMessage(contact, options = {}) {
  const filePath = options.filePath || path.join(__dirname, '..', '..', 'data', 'contacts.json');
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let contacts = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.trim()) {
      contacts = JSON.parse(raw);
    }
  }

  const savedContact = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...contact,
    createdAt: new Date().toISOString(),
  };

  contacts.push(savedContact);
  fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2));
  return savedContact;
}

module.exports = {
  saveContactMessage,
  buildValidationError,
};