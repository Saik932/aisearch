/**
 * searchEngine.js
 *
 * Core search logic for the Tax Search & Analytics Platform.
 * Data is loaded from the in-memory JSON store (data/seed.json).
 *
 * Supported search modes:
 *   basic    — case-insensitive substring match across key fields
 *   semantic — natural-language phrase → concept keyword / filter mapping
 *   fuzzy    — Fuse.js similarity matching (handles typos / OCR errors)
 *   wildcard — prefix / glob-style pattern matching (* and ?)
 *   boolean  — OR / AND token logic across client and employer fields
 *
 * Structured filters (combinable with any mode):
 *   missingSSN, missingEmployer, wagesGreaterThan, wagesMin, wagesMax,
 *   state, taxYear, employerName, formType, flags
 */

"use strict";

const Fuse = require("fuse.js");
const { records } = require("../data/store");

// ---------------------------------------------------------------------------
// Semantic concept map
// Maps natural-language phrases → employer keywords and/or filter overrides.
// Extend this map to support new business vocabulary without code changes.
// ---------------------------------------------------------------------------
const SEMANTIC_MAP = [
  {
    phrases: ["tech companies", "technology companies", "tech firms", "technology firms",
              "software companies", "it companies", "tech employers", "technology employers",
              "tech sector", "technology sector"],
    keywords: ["techstart", "software dynamics", "cloudnet", "datapipe", "tech", "software", "cloud", "data"],
  },
  {
    phrases: ["high income", "high wage", "high salary", "high earner", "high earning",
              "high income tax forms", "high wage filings", "high wage records",
              "top earners", "premium filings", "large wage", "high compensation"],
    keywords: null,
    wagesGreaterThan: 1000000,
  },
  {
    phrases: ["missing data", "incomplete filings", "missing ssn", "missing information",
              "incomplete records", "data quality issues", "missing fields"],
    keywords: null,
    missingSSN: true,
  },
  {
    phrases: ["finance", "financial", "banking", "investment", "financial services"],
    keywords: ["global finance", "finance", "financial"],
  },
  {
    phrases: ["healthcare", "health care", "medical", "hospital", "health services"],
    keywords: ["healthcare plus", "health", "medical"],
  },
  {
    phrases: ["retail", "store", "shop", "consumer goods", "merchandise"],
    keywords: ["retail masters", "retail", "store"],
  },
  {
    phrases: ["california", "ca filings", "california filings", "california records"],
    keywords: null,
    state: "CA",
  },
  {
    phrases: ["new york", "ny filings", "new york filings"],
    keywords: null,
    state: "NY",
  },
  {
    phrases: ["w-2", "w2", "wage forms", "wage filings", "employee wages"],
    keywords: null,
    formType: "W-2",
  },
  {
    phrases: ["1099", "contractor", "freelance", "independent contractor", "self employed"],
    keywords: null,
    formType: "1099",
  },
];

/**
 * Resolves a natural-language query to keywords and/or filter overrides.
 */
function resolveSemanticIntent(query) {
  const lower = (query || "").toLowerCase().trim();
  const filterOverrides = {};
  const allKeywords = [];

  for (const entry of SEMANTIC_MAP) {
    const matched = entry.phrases.some((p) => lower.includes(p));
    if (!matched) continue;

    if (entry.keywords)                       allKeywords.push(...entry.keywords);
    if (entry.wagesGreaterThan !== undefined) filterOverrides.wagesGreaterThan = entry.wagesGreaterThan;
    if (entry.missingSSN !== undefined)       filterOverrides.missingSSN = entry.missingSSN;
    if (entry.state !== undefined)            filterOverrides.state = entry.state;
    if (entry.formType !== undefined)         filterOverrides.formType = entry.formType;
  }

  if (allKeywords.length === 0 && Object.keys(filterOverrides).length === 0) {
    return { keywords: lower.split(/\s+/), filterOverrides: {} };
  }

  return { keywords: allKeywords.length > 0 ? allKeywords : null, filterOverrides };
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates and coerces pagination parameters.
 */
function validatePagination(page, pageSize) {
  const p  = parseInt(page, 10);
  const ps = parseInt(pageSize, 10);
  if (isNaN(p)  || p  < 1)             throw Object.assign(new Error("'page' must be a positive integer"), { statusCode: 400 });
  if (isNaN(ps) || ps < 1 || ps > 200) throw Object.assign(new Error("'pageSize' must be between 1 and 200"), { statusCode: 400 });
  return { page: p, pageSize: ps };
}

/**
 * Validates a numeric filter value.
 */
function validateNumeric(value, fieldName) {
  const n = parseFloat(value);
  if (isNaN(n) || !isFinite(n))
    throw Object.assign(new Error(`'${fieldName}' must be a valid number, got: ${value}`), { statusCode: 400 });
  return n;
}

/**
 * Validates a four-digit tax year.
 */
function validateTaxYear(value) {
  const y = parseInt(value, 10);
  if (isNaN(y) || y < 1900 || y > 2100)
    throw Object.assign(new Error(`'taxYear' must be a valid four-digit year, got: ${value}`), { statusCode: 400 });
  return y;
}

// ---------------------------------------------------------------------------
// Structured filter application
// ---------------------------------------------------------------------------

/**
 * Applies all structured filters to a dataset array.
 * Each filter is independent and combinable with others.
 */
function applyFilters(dataset, filters) {
  let results = dataset;

  // Missing SSN: null, empty string, or literal "null"
  if (filters.missingSSN === true || filters.missingSSN === "true") {
    results = results.filter((r) => !r.ssn || r.ssn.trim() === "" || r.ssn === "null");
  }

  // Missing employer: empty or null employerName
  if (filters.missingEmployer === true || filters.missingEmployer === "true") {
    results = results.filter((r) => !r.employerName || r.employerName.trim() === "");
  }

  // Wages strictly greater than threshold
  if (filters.wagesGreaterThan !== undefined) {
    const threshold = validateNumeric(filters.wagesGreaterThan, "wagesGreaterThan");
    results = results.filter((r) => r.wages > threshold);
  }

  // Wage band — inclusive lower bound
  if (filters.wagesMin !== undefined) {
    const min = validateNumeric(filters.wagesMin, "wagesMin");
    results = results.filter((r) => r.wages >= min);
  }

  // Wage band — inclusive upper bound
  if (filters.wagesMax !== undefined) {
    const max = validateNumeric(filters.wagesMax, "wagesMax");
    results = results.filter((r) => r.wages <= max);
  }

  // State — case-insensitive exact match on two-letter code
  if (filters.state) {
    const s = filters.state.toUpperCase().trim();
    results = results.filter((r) => (r.state || "").toUpperCase() === s);
  }

  // Tax year — exact integer match
  if (filters.taxYear) {
    const year = validateTaxYear(filters.taxYear);
    results = results.filter((r) => r.taxYear === year);
  }

  // Employer name — case-insensitive substring match
  if (filters.employerName) {
    const emp = filters.employerName.toLowerCase().trim();
    results = results.filter((r) => (r.employerName || "").toLowerCase().includes(emp));
  }

  // Form type — case-insensitive exact match
  if (filters.formType) {
    const ft = filters.formType.toLowerCase().trim();
    results = results.filter((r) => (r.formType || "").toLowerCase() === ft);
  }

  // Flags — record must contain ALL specified flags
  if (filters.flags) {
    const flagList = Array.isArray(filters.flags) ? filters.flags : [filters.flags];
    results = results.filter((r) => flagList.every((f) => (r.flags || []).includes(f)));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Search mode implementations
// ---------------------------------------------------------------------------

/**
 * Semantic search: resolves natural-language phrases to keywords and/or
 * filter overrides, then applies both to the dataset.
 */
function semanticSearch(query, dataset, existingFilters) {
  const { keywords, filterOverrides } = resolveSemanticIntent(query || "");

  // Merge semantic filter overrides with existing filters (existing take precedence)
  const mergedFilters = { ...filterOverrides, ...existingFilters };
  let filtered = applyFilters(dataset, mergedFilters);

  // If keywords resolved, further narrow by keyword match in text fields
  if (keywords && keywords.length > 0) {
    filtered = filtered.filter((r) => {
      const haystack = `${r.clientName} ${r.employerName} ${r.formType} ${r.state}`.toLowerCase();
      return keywords.some((kw) => haystack.includes(kw));
    });
  }

  return filtered;
}

/**
 * Fuzzy search: uses Fuse.js similarity scoring to handle typos and
 * OCR errors. Searches clientName and employerName by default.
 */
function fuzzySearch(query, dataset, targetField) {
  if (!query || query.trim() === "") return dataset;

  const keys = targetField ? [targetField] : ["clientName", "employerName"];

  const fuse = new Fuse(dataset, {
    keys,
    threshold: 0.5,        // 0 = exact match only, 1 = match anything
    includeScore: true,
    ignoreLocation: true,  // match anywhere in the string, not just start
    minMatchCharLength: 2,
  });

  return fuse.search(query).map((r) => r.item);
}

/**
 * Wildcard search: converts * (any chars) and ? (single char) to regex.
 * Matches against clientName and employerName.
 */
function wildcardSearch(query, dataset) {
  if (!query || query.trim() === "") return dataset;

  // Escape all regex special characters except * and ?
  const escaped = query.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
  const regex   = new RegExp(`^${pattern}`, "i");

  return dataset.filter(
    (r) => regex.test(r.clientName || "") || regex.test(r.employerName || "")
  );
}

/**
 * Boolean search: parses OR / AND operators and evaluates against
 * the combined clientName + employerName haystack.
 */
function booleanSearch(query, dataset) {
  if (!query || query.trim() === "") return dataset;

  let tokens;
  let operator = "OR";

  if (/\bAND\b/i.test(query)) {
    operator = "AND";
    tokens = query.split(/\bAND\b/i).map((t) => t.trim().toLowerCase()).filter(Boolean);
  } else {
    tokens = query.split(/\bOR\b/i).map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  if (tokens.length === 0) return dataset;

  return dataset.filter((r) => {
    const haystack = `${r.clientName || ""} ${r.employerName || ""}`.toLowerCase();
    return operator === "OR"
      ? tokens.some((t) => haystack.includes(t))
      : tokens.every((t) => haystack.includes(t));
  });
}

// ---------------------------------------------------------------------------
// Main search entry point
// ---------------------------------------------------------------------------

/**
 * Executes a search against the in-memory record store.
 *
 * @param {object} params
 * @param {string}  params.query       - Free-text search input
 * @param {string}  params.mode        - Search mode: basic|semantic|fuzzy|wildcard|boolean
 * @param {string}  params.targetField - For fuzzy: field to target (clientName|employerName)
 * @param {object}  params.filters     - Structured filter map
 * @param {number}  params.page        - 1-based page number
 * @param {number}  params.pageSize    - Results per page (max 200)
 * @returns {{ total: number, page: number, pageSize: number, results: object[] }}
 */
function search({ query, mode, targetField, filters = {}, page = 1, pageSize = 50 }) {
  const { page: p, pageSize: ps } = validatePagination(page, pageSize);
  const searchMode = (mode || "basic").toLowerCase();

  let dataset;

  if (searchMode === "semantic") {
    // Semantic search handles its own filter merging internally
    dataset = semanticSearch(query, records, filters);
  } else {
    // All other modes: apply structured filters first, then text search
    dataset = applyFilters(records, filters);

    if (query && query.trim() !== "") {
      switch (searchMode) {
        case "fuzzy":
          dataset = fuzzySearch(query, dataset, targetField);
          break;
        case "wildcard":
          dataset = wildcardSearch(query, dataset);
          break;
        case "boolean":
          dataset = booleanSearch(query, dataset);
          break;
        default: {
          // basic: case-insensitive substring across all key text fields
          const q = (query || "").toLowerCase().trim();
          dataset = dataset.filter(
            (r) =>
              (r.clientName    || "").toLowerCase().includes(q) ||
              (r.employerName  || "").toLowerCase().includes(q) ||
              (r.state         || "").toLowerCase().includes(q) ||
              (r.formType      || "").toLowerCase().includes(q)
          );
        }
      }
    }
  }

  const total   = dataset.length;
  const start   = (p - 1) * ps;
  const results = dataset.slice(start, start + ps);

  return { total, page: p, pageSize: ps, results };
}

// ---------------------------------------------------------------------------
// Faceted aggregation
// ---------------------------------------------------------------------------

/**
 * Groups the filtered dataset by formType, taxYear, and state,
 * returning counts for each bucket.
 */
function facets(filters = {}) {
  const dataset = applyFilters(records, filters);

  const byFormType = {};
  const byTaxYear  = {};
  const byState    = {};

  for (const r of dataset) {
    const ft = r.formType || "Unknown";
    const ty = r.taxYear  || "Unknown";
    const st = r.state    || "Unknown";

    byFormType[ft] = (byFormType[ft] || 0) + 1;
    byTaxYear[ty]  = (byTaxYear[ty]  || 0) + 1;
    byState[st]    = (byState[st]    || 0) + 1;
  }

  return {
    total: dataset.length,
    facets: {
      formType: Object.entries(byFormType).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
      taxYear:  Object.entries(byTaxYear).map(([key, count]) => ({ key: isNaN(key) ? key : parseInt(key, 10), count })).sort((a, b) => b.key - a.key),
      state:    Object.entries(byState).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    },
  };
}

// ---------------------------------------------------------------------------
// Suggest / autocomplete
// ---------------------------------------------------------------------------

/**
 * Returns up to 10 autocomplete suggestions for a given prefix.
 * First collects exact prefix matches, then fills remaining slots
 * with fuzzy near-matches.
 *
 * @param {string} prefix - Partial text typed by the user
 * @param {string} scope  - "client" | "employer" | "all"
 * @returns {string[]}
 */
function suggest(prefix, scope = "all") {
  if (!prefix || prefix.trim() === "") return [];

  const lower = prefix.toLowerCase().trim();
  const seen  = new Set();
  const suggestions = [];

  // Pass 1: exact prefix matches (fast path)
  for (const r of records) {
    const candidates = [];
    if (scope === "client"   || scope === "all") candidates.push(r.clientName);
    if (scope === "employer" || scope === "all") candidates.push(r.employerName);

    for (const c of candidates) {
      if (c && c.toLowerCase().startsWith(lower) && !seen.has(c)) {
        seen.add(c);
        suggestions.push(c);
      }
    }
  }

  // Pass 2: fuzzy fill-in if fewer than 5 prefix matches found
  if (suggestions.length < 5) {
    const fuseKeys =
      scope === "client"   ? ["clientName"] :
      scope === "employer" ? ["employerName"] :
                             ["clientName", "employerName"];

    const fuse = new Fuse(records, { keys: fuseKeys, threshold: 0.4, includeScore: true });

    for (const fr of fuse.search(prefix)) {
      const val = scope === "employer" ? fr.item.employerName : fr.item.clientName;
      if (val && !seen.has(val)) {
        seen.add(val);
        suggestions.push(val);
      }
    }
  }

  return suggestions.slice(0, 10);
}

module.exports = { search, facets, suggest };
