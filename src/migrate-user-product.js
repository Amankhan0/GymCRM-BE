#!/usr/bin/env node
// One-time migration for the User collection after adding `product` field.
//
// Run once locally (or via Render shell) after deploying the b2b changes:
//   node src/migrate-user-product.js
//
// What it does:
//   1. Backfills product='gym' on any User without it (existing rows).
//   2. Drops the old `email_1` single-field unique index (left behind by Mongoose).
//   3. The new compound `email_1_product_1` unique index is auto-created on next app boot.

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Users = mongoose.connection.collection('users');

  const back = await Users.updateMany(
    { product: { $exists: false } },
    { $set: { product: 'gym' } }
  );
  console.log(`Backfilled product='gym' on ${back.modifiedCount} users.`);

  // Drop the legacy single-field unique index on email if it exists. Safe to ignore "not found".
  try {
    await Users.dropIndex('email_1');
    console.log("Dropped legacy index 'email_1'.");
  } catch (err) {
    if (err.codeName === 'IndexNotFound' || /index not found/i.test(err.message)) {
      console.log("Legacy index 'email_1' already absent — nothing to drop.");
    } else {
      throw err;
    }
  }

  console.log('Migration complete. Restart the app — Mongoose will auto-create the new compound index.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
