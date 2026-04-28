/**
 * seed.js — Imports seed data from data/seed.json into MongoDB.
 * Run once: node backend/db/seed.js
 *
 * Safe to re-run — clears the collection before inserting.
 */

"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const TaxRecord = require("../models/TaxRecord");
const records = require("../../data/seed.json");

async function seed() {
  try {
    console.log("Connecting to MongoDB…");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected:", mongoose.connection.host);

    // Clear existing records
    const deleted = await TaxRecord.deleteMany({});
    console.log(`🗑  Cleared ${deleted.deletedCount} existing records`);

    // Insert seed data
    const inserted = await TaxRecord.insertMany(records);
    console.log(`✅ Inserted ${inserted.length} records into 'taxrecords' collection`);

    await mongoose.disconnect();
    console.log("Done. Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
