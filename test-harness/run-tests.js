/**
 * QA Test Harness — Tax Search & Analytics Platform
 *
 * Test cases:
 *   SEMANTIC-001  "tech companies"        → results map to technology-related employers
 *   SEMANTIC-002  "high income tax forms" → results are high-wage records (wages > $1M)
 *   FUZZY-001     "Jhon Smth"             → top results include "John Smith"
 *   FUZZY-002     "Acmee Corp"            → results include Acme Corp filings
 *
 * Usage:
 *   node run-tests.js [--base-url http://localhost:4000]
 *
 * Exit codes:
 *   0 — all tests passed
 *   1 — one or more tests failed
 */

"use strict";

const fetch = require("node-fetch");

// ── Config ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const baseUrlFlag = args.indexOf("--base-url");
const BASE_URL =
  baseUrlFlag !== -1 ? args[baseUrlFlag + 1] : "http://localhost:4000";

// Tech-related employer keywords (lower-case)
const TECH_KEYWORDS = ["techstart", "software dynamics", "cloudnet", "datapipe", "tech", "software", "cloud", "data"];

// High-wage threshold matching the semantic map
const HIGH_WAGE_THRESHOLD = 1000000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calls the /api/search endpoint with the given params.
 * Returns the parsed JSON response.
 */
async function callSearch(params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  const url = `${BASE_URL}/api/search?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/**
 * Returns true if the employer name contains any tech-related keyword.
 */
function isTechEmployer(employerName) {
  const lower = (employerName || "").toLowerCase();
  return TECH_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Test runner ───────────────────────────────────────────────────────────────
const testResults = [];

async function runTest(id, description, fn) {
  process.stdout.write(`  Running ${id}: ${description} … `);
  try {
    const { passed, reason } = await fn();
    testResults.push({ id, description, passed, reason });
    console.log(passed ? "✅ PASS" : `❌ FAIL — ${reason}`);
  } catch (err) {
    const reason = `Exception: ${err.message}`;
    testResults.push({ id, description, passed: false, reason });
    console.log(`❌ FAIL — ${reason}`);
  }
}

// ── Test Cases ────────────────────────────────────────────────────────────────

/**
 * SEMANTIC-001
 * Query: "tech companies", mode: semantic
 *
 * Validation rules:
 *   - At least one result must be returned
 *   - At least one result must be a technology-related employer
 *   - Non-tech employers must not dominate the top 3 results
 */
async function testSemantic001() {
  const data = await callSearch({ query: "tech companies", mode: "semantic", pageSize: 10 });
  const results = data.results || [];

  if (results.length === 0) {
    return {
      passed: false,
      reason: "No results returned — expected technology-related filings",
    };
  }

  const techResults = results.filter((r) => isTechEmployer(r.employerName));
  if (techResults.length === 0) {
    return {
      passed: false,
      reason: `No technology-related employers found. Got: ${results.map((r) => r.employerName).join(", ")}`,
    };
  }

  // Top 3 must not be entirely non-tech
  const top3 = results.slice(0, Math.min(3, results.length));
  const nonTechTop3 = top3.filter((r) => !isTechEmployer(r.employerName));
  if (nonTechTop3.length === top3.length) {
    return {
      passed: false,
      reason: `Top ${top3.length} results are all non-tech employers: ${top3.map((r) => r.employerName).join(", ")}`,
    };
  }

  return {
    passed: true,
    reason: `${techResults.length}/${results.length} results are tech-related. Top: ${results[0].employerName}`,
  };
}

/**
 * SEMANTIC-002
 * Query: "high income tax forms", mode: semantic
 *
 * Validation rules:
 *   - At least one result must be returned
 *   - All returned records must have wages > HIGH_WAGE_THRESHOLD
 *   - Low-wage records must not appear in results
 */
async function testSemantic002() {
  const data = await callSearch({ query: "high income tax forms", mode: "semantic", pageSize: 10 });
  const results = data.results || [];

  if (results.length === 0) {
    return {
      passed: false,
      reason: `No results returned — expected high-wage filings (wages > $${HIGH_WAGE_THRESHOLD.toLocaleString()})`,
    };
  }

  const lowWageResults = results.filter((r) => r.wages <= HIGH_WAGE_THRESHOLD);
  if (lowWageResults.length > 0) {
    return {
      passed: false,
      reason: `${lowWageResults.length} low-wage record(s) found in results: ${lowWageResults.map((r) => `${r.clientName} ($${r.wages.toLocaleString()})`).join(", ")}`,
    };
  }

  return {
    passed: true,
    reason: `${results.length} high-wage record(s) returned, all with wages > $${HIGH_WAGE_THRESHOLD.toLocaleString()}`,
  };
}

/**
 * FUZZY-001
 * Query: "Jhon Smth", mode: fuzzy
 *
 * Validation rules:
 *   - "John Smith" must appear in results
 *   - "John Smith" must rank in the top 3
 *   - Unrelated names must not rank above the expected match
 */
async function testFuzzy001() {
  const EXPECTED_NAME = "John Smith";
  const data = await callSearch({ query: "Jhon Smth", mode: "fuzzy", pageSize: 10 });
  const results = data.results || [];

  if (results.length === 0) {
    return {
      passed: false,
      reason: `No results returned — expected near-match for "${EXPECTED_NAME}"`,
    };
  }

  const idx = results.findIndex(
    (r) => r.clientName.toLowerCase() === EXPECTED_NAME.toLowerCase()
  );

  if (idx === -1) {
    return {
      passed: false,
      reason: `"${EXPECTED_NAME}" not found in results. Got: ${results.map((r) => r.clientName).join(", ")}`,
    };
  }

  if (idx > 2) {
    return {
      passed: false,
      reason: `"${EXPECTED_NAME}" found at rank ${idx + 1} (expected top 3). Results: ${results.map((r) => r.clientName).join(", ")}`,
    };
  }

  return {
    passed: true,
    reason: `"${EXPECTED_NAME}" found at rank ${idx + 1}`,
  };
}

/**
 * FUZZY-002
 * Query: "Acmee Corp", mode: fuzzy, targetField: employerName
 *
 * Validation rules:
 *   - Results must include filings tied to "Acme Corp"
 *   - Acme Corp must appear in top 3
 */
async function testFuzzy002() {
  const EXPECTED_EMPLOYER = "Acme Corp";
  const data = await callSearch({
    query: "Acmee Corp",
    mode: "fuzzy",
    targetField: "employerName",
    pageSize: 10,
  });
  const results = data.results || [];

  if (results.length === 0) {
    return {
      passed: false,
      reason: `No results returned — expected near-match for "${EXPECTED_EMPLOYER}"`,
    };
  }

  const acmeResults = results.filter(
    (r) => r.employerName.toLowerCase().includes("acme")
  );

  if (acmeResults.length === 0) {
    return {
      passed: false,
      reason: `No "${EXPECTED_EMPLOYER}" records found. Got employers: ${[...new Set(results.map((r) => r.employerName))].join(", ")}`,
    };
  }

  const firstAcmeIdx = results.findIndex((r) =>
    r.employerName.toLowerCase().includes("acme")
  );

  if (firstAcmeIdx > 2) {
    return {
      passed: false,
      reason: `"${EXPECTED_EMPLOYER}" first appears at rank ${firstAcmeIdx + 1} (expected top 3)`,
    };
  }

  return {
    passed: true,
    reason: `"${EXPECTED_EMPLOYER}" first appears at rank ${firstAcmeIdx + 1} (${acmeResults.length} total matches)`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   Tax Search & Analytics — QA Test Harness               ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Target: ${BASE_URL}\n`);

  // Verify server is reachable before running tests
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error(`Health check returned ${health.status}`);
    console.log("  ✅ Server reachable\n");
  } catch (e) {
    console.error(`  ❌ Cannot reach server at ${BASE_URL}: ${e.message}`);
    console.error("  Make sure the backend is running: cd backend && npm start\n");
    process.exit(1);
  }

  // Run all test cases
  await runTest("SEMANTIC-001", '"tech companies" → technology-related employers', testSemantic001);
  await runTest("SEMANTIC-002", '"high income tax forms" → high-wage records only', testSemantic002);
  await runTest("FUZZY-001", '"Jhon Smth" → top results include "John Smith"', testFuzzy001);
  await runTest("FUZZY-002", '"Acmee Corp" → top results include "Acme Corp"', testFuzzy002);

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;

  console.log("\n──────────────────────────────────────────────────────────");
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n  Failed assertions:");
    testResults
      .filter((t) => !t.passed)
      .forEach((t) => console.log(`    • [${t.id}] ${t.reason}`));
  } else {
    console.log("\n  All tests passed ✅");
  }

  console.log("──────────────────────────────────────────────────────────\n");
  process.exit(failed > 0 ? 1 : 0);
}

main();
