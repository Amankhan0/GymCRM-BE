#!/usr/bin/env node
// Tiny CLI for inspecting / clearing the BlockedClient collection.
// Usage:
//   node src/manageBlocks.js list
//   node src/manageBlocks.js clear ip:1.2.3.4
//   node src/manageBlocks.js clear-all

require('dotenv').config();
const mongoose = require('mongoose');
const BlockedClient = require('./models/BlockedClient');

const fmt = (d) => (d ? new Date(d).toISOString() : '-');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const [, , cmd, arg] = process.argv;

  try {
    if (cmd === 'list') {
      const items = await BlockedClient.find().sort({ updatedAt: -1 }).limit(100);
      if (!items.length) return console.log('No blocked clients.');
      for (const i of items) {
        console.log(
          `${i.key.padEnd(40)}  violations=${i.violations}  permanent=${i.permanent}  bannedUntil=${fmt(i.bannedUntil)}  reason=${i.reason || ''}`
        );
      }
    } else if (cmd === 'clear' && arg) {
      const r = await BlockedClient.deleteOne({ key: arg });
      console.log(r.deletedCount ? `Cleared ${arg}` : `Not found: ${arg}`);
    } else if (cmd === 'clear-all') {
      const r = await BlockedClient.deleteMany({});
      console.log(`Cleared ${r.deletedCount} entries.`);
    } else {
      console.log('Usage: node src/manageBlocks.js <list|clear <key>|clear-all>');
    }
  } finally {
    await mongoose.disconnect();
  }
})();
