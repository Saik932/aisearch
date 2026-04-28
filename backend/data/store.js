/**
 * store.js
 * In-memory data store — loads seed data once at startup from seed.json.
 * In production this would be replaced by a database client.
 */

"use strict";

const path = require("path");
const fs   = require("fs");

const seedPath = path.resolve(__dirname, "../../data/seed.json");
const records  = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

module.exports = { records };
