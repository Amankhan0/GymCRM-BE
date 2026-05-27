require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// Fail fast if security-critical env vars are missing or weak — better to crash at boot than
// silently start with a forge-able JWT_SECRET in production.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long.');
  process.exit(1);
}
if (!process.env.SUPERADMIN_PASSWORD) {
  console.warn('WARN: SUPERADMIN_PASSWORD is not set — /api/superadmin endpoints will be inaccessible.');
}

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
})();
