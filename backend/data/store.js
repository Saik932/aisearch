/**
 * store.js
 * Data access layer — wraps MongoDB queries behind a simple async interface.
 * The search engine calls these functions instead of reading from a flat array.
 */

"use strict";

const TaxRecord = require("../models/TaxRecord");

/**
 * Returns all records as plain JS objects.
 * Used by the search engine which operates on in-memory arrays after fetch.
 */
async function getAllRecords() {
  const docs = await TaxRecord.find({}).lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    clientName:   d.clientName   || "",
    employerName: d.employerName || "",
    formType:     d.formType     || "",
    taxYear:      d.taxYear,
    state:        d.state        || "",
    wages:        d.wages        || 0,
    ssn:          d.ssn          || "",
    flags:        d.flags        || [],
  }));
}

module.exports = { getAllRecords };
