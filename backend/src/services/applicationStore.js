const fs = require('fs');
const path = require('path');

function buildDuplicateError() {
  const error = new Error('You have already applied to this listing');
  error.code = 'DUPLICATE_APPLICATION';
  return error;
}

async function saveApplication(application, options = {}) {
  const filePath = options.filePath || path.join(__dirname, '..', '..', 'data', 'applications.json');
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let applications = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.trim()) {
      applications = JSON.parse(raw);
    }
  }

  const duplicate = applications.find(
    (item) => item.listing_id === application.listing_id && item.applicant_id === application.applicant_id
  );

  if (duplicate) {
    throw buildDuplicateError();
  }

  const savedApplication = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...application,
    createdAt: new Date().toISOString(),
  };

  applications.push(savedApplication);
  fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
  return savedApplication;
}

module.exports = {
  saveApplication,
};
