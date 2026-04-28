/**
 * search.js — API route handlers
 *
 * Routes:
 *   GET /api/search   — unified search (basic, semantic, fuzzy, wildcard, boolean)
 *   GET /api/facets   — faceted aggregation by formType, taxYear, state
 *   GET /api/suggest  — autocomplete / suggest-as-you-type
 */

"use strict";

const express = require("express");
const router  = express.Router();
const { search, facets, suggest } = require("../utils/searchEngine");

// ---------------------------------------------------------------------------
// Shared: extract and clean filter params from query string
// ---------------------------------------------------------------------------
function extractFilters(query) {
  const {
    missingSSN, missingEmployer,
    wagesGreaterThan, wagesMin, wagesMax,
    state, taxYear, employerName, formType, flags,
  } = query;

  const filters = {
    missingSSN, missingEmployer,
    wagesGreaterThan, wagesMin, wagesMax,
    state, taxYear, employerName, formType, flags,
  };

  // Drop keys that were not provided
  Object.keys(filters).forEach((k) => {
    if (filters[k] === undefined || filters[k] === "") delete filters[k];
  });

  return filters;
}

// ---------------------------------------------------------------------------
// GET /api/search
// ---------------------------------------------------------------------------
router.get("/search", async (req, res) => {
  try {
    const { query, mode, targetField, page = 1, pageSize = 50 } = req.query;
    const filters = extractFilters(req.query);

    const result = await search({ query, mode, targetField, filters, page, pageSize });
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    console.error(`[search] ${status} — ${err.message}`);
    res.status(status).json({
      error: status === 400 ? "Invalid request parameters" : "Internal search error",
      detail: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/facets
// ---------------------------------------------------------------------------
router.get("/facets", async (req, res) => {
  try {
    const filters = extractFilters(req.query);
    const result  = await facets(filters);
    res.json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    console.error(`[facets] ${status} — ${err.message}`);
    res.status(status).json({
      error: status === 400 ? "Invalid request parameters" : "Internal facets error",
      detail: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suggest
// ---------------------------------------------------------------------------
router.get("/suggest", async (req, res) => {
  try {
    const { prefix, scope = "all" } = req.query;

    if (!prefix || prefix.trim() === "") {
      return res.status(400).json({
        error: "Invalid request parameters",
        detail: "'prefix' query parameter is required",
      });
    }

    const validScopes = ["client", "employer", "all"];
    if (!validScopes.includes(scope)) {
      return res.status(400).json({
        error: "Invalid request parameters",
        detail: `'scope' must be one of: ${validScopes.join(", ")}`,
      });
    }

    const suggestions = await suggest(prefix, scope);
    res.json({ suggestions });
  } catch (err) {
    console.error(`[suggest] ${err.message}`);
    res.status(500).json({
      error: "Internal suggest error",
      detail: err.message,
    });
  }
});

module.exports = router;
