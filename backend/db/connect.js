/**
 * connect.js — Mongoose connection helper.
 * Call once at server startup; reuses the connection across all requests.
 */

"use strict";

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // fail fast after 10s
      connectTimeoutMS: 10000,
    });
    console.log("✅ MongoDB connected:", mongoose.connection.host);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error("   Check: 1) Atlas IP whitelist includes your IP");
    console.error("          2) Username/password are correct");
    console.error("          3) Cluster is not paused");
    process.exit(1);
  }
}

module.exports = connectDB;
