/**
 * TaxRecord.js — Mongoose model for tax filing documents.
 * Collection name: taxrecords
 */

"use strict";

const mongoose = require("mongoose");

const taxRecordSchema = new mongoose.Schema(
  {
    clientName:   { type: String, default: "" },
    employerName: { type: String, default: "" },
    formType:     { type: String, enum: ["W-2", "1099"], default: "W-2" },
    taxYear:      { type: Number },
    state:        { type: String, default: "" },
    wages:        { type: Number, default: 0 },
    ssn:          { type: String, default: "" },
    flags:        { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: "taxrecords",
  }
);

// Text index for basic keyword search across key string fields
taxRecordSchema.index({
  clientName:   "text",
  employerName: "text",
  formType:     "text",
  state:        "text",
});

module.exports = mongoose.model("TaxRecord", taxRecordSchema);
