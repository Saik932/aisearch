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

  // Drop keys that were not provided so applyFilters presence checks work correctly
  Object.keys(filters).forEach((k) => {
    if (filters[k] === undefined || filters[k] === "") delete filters[k];
  });

  return filters;
}

// ---------------------------------------------------------------------------
// GET /api/search
//
// Query parameters:
//   query            {string}  Free-text search input
//   mode             {string}  basic | semantic | fuzzy | wildcard | boolean
//   targetField      {string}  For fuzzy: clientName | employerName
//   missingSSN       {boolean} Filter records with missing/empty SSN
//   missingEmployer  {boolean} Filter records with missing/empty employer
//   wagesGreaterThan {number}  Wages strictly above threshold
//   wagesMin         {number}  Wage band lower bound (inclusive)
//   wagesMax         {number}  Wage band upper bound (inclusive)
//   state            {string}  Two-letter state code
//   taxYear          {number}  Four-digit year
//   employerName     {string}  Employer name substring
//   formType         {string}  W-2 | 1099
//   flags            {string}  Repeatable: missing_ssn | missing_employer | high_wage
//   page             {number}  Page number (default: 1)
//   pageSize         {number}  Results per page, max 200 (default: 50)
// ---------------------------------------------------------------------------
router.get("/search", (req, res) => {
  try {
    const { query, mode, targetField, page = 1, pageSize = 50 } = req.query;
    const filters = extractFilters(req.query);

    const result = search({ query, mode, targetField, filters, page, pageSize });
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
//
// Accepts the same filter params as /api/search (no query/mode).
// Returns grouped counts by formType, taxYear, and state.
// ---------------------------------------------------------------------------
router.get("/facets", (req, res) => {
  try {
    const filters = extractFilters(req.query);
    res.json(facets(filters));
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
//
// Query parameters:
//   prefix  {string}  Partial text typed by the user (required)
//   scope   {string}  client | employer | all  (default: all)
// ---------------------------------------------------------------------------
router.get("/suggest", (req, res) => {
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

    const suggestions = suggest(prefix, scope);
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
