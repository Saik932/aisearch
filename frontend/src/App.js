import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchTax, fetchFacets, fetchSuggestions } from "./api";

// ── Constants ────────────────────────────────────────────────────────────────
const SEARCH_MODES = ["basic", "semantic", "fuzzy", "wildcard", "boolean"];

const YEARS = ["", "2021", "2022", "2023"];
const FORMS = ["", "W-2", "1099"];
const STATES = ["", "CA", "NY", "TX", "FL", "WA"];

const FLAG_OPTIONS = [
  { value: "missing_ssn", label: "Missing SSN" },
  { value: "missing_employer", label: "Missing Employer" },
  { value: "high_wage", label: "High Wage" },
];

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatWages(val) {
  if (val === undefined || val === null) return "N/A";
  return `$${Number(val).toLocaleString()}`;
}

function FlagBadges({ flags, ssn, employerName }) {
  const badges = [];

  if (!ssn || ssn.trim() === "") {
    badges.push(<span key="ssn" className="badge badge-missing_ssn">Missing SSN</span>);
  }
  if (!employerName || employerName.trim() === "") {
    badges.push(<span key="emp" className="badge badge-missing_employer">Missing Employer</span>);
  }
  if (flags && flags.includes("high_wage")) {
    badges.push(<span key="hw" className="badge badge-high_wage">High Wage</span>);
  }

  if (badges.length === 0) {
    return <span className="badge badge-na">—</span>;
  }
  return <>{badges}</>;
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Search state
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("basic");
  const [year, setYear] = useState("");
  const [form, setForm] = useState("");
  const [state, setState] = useState("");
  const [selectedFlags, setSelectedFlags] = useState([]);

  // Results state
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Facets
  const [facets, setFacets] = useState(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);
  const searchInputRef = useRef(null);

  // Sort
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // ── Build filter object ────────────────────────────────────────────────────
  const buildParams = useCallback(
    (overridePage) => {
      const params = {
        query: query || undefined,
        mode,
        page: overridePage || page,
        pageSize: PAGE_SIZE,
      };

      if (year) params.taxYear = year;
      if (form) params.formType = form;
      if (state) params.state = state;
      if (selectedFlags.includes("missing_ssn")) params.missingSSN = "true";
      if (selectedFlags.includes("high_wage")) params.wagesGreaterThan = 1000000;
      if (selectedFlags.length > 0) {
        // pass remaining flags as array filter
        const nonSpecial = selectedFlags.filter(
          (f) => f !== "missing_ssn" && f !== "high_wage"
        );
        if (nonSpecial.length > 0) params.flags = nonSpecial;
      }

      return params;
    },
    [query, mode, page, year, form, state, selectedFlags]
  );

  // ── Execute search ─────────────────────────────────────────────────────────
  const runSearch = useCallback(
    async (overridePage) => {
      setLoading(true);
      setError(null);
      try {
        const params = buildParams(overridePage);
        const data = await searchTax(params);
        setResults(data.results || []);
        setTotal(data.total || 0);
        if (overridePage) setPage(overridePage);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  // ── Load facets ────────────────────────────────────────────────────────────
  const loadFacets = useCallback(async () => {
    try {
      const filters = {};
      if (year) filters.taxYear = year;
      if (form) filters.formType = form;
      if (state) filters.state = state;
      const data = await fetchFacets(filters);
      setFacets(data.facets);
    } catch (_) {}
  }, [year, form, state]);

  // Initial load
  useEffect(() => {
    runSearch(1);
    loadFacets();
    // eslint-disable-next-line
  }, []);

  // ── Autocomplete ───────────────────────────────────────────────────────────
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    clearTimeout(suggestTimer.current);
    if (val.trim().length >= 1) {
      suggestTimer.current = setTimeout(async () => {
        const s = await fetchSuggestions(val);
        setSuggestions(s);
        setShowSuggestions(s.length > 0);
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s) => {
    setQuery(s);
    setShowSuggestions(false);
    setTimeout(() => runSearch(1), 0);
  };

  // ── Flag toggle ────────────────────────────────────────────────────────────
  const toggleFlag = (val) => {
    setSelectedFlags((prev) =>
      prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]
    );
  };

  // ── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortField) return 0;
    const av = a[sortField];
    const bv = b[sortField];
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  // ── Clear all ──────────────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery("");
    setMode("basic");
    setYear("");
    setForm("");
    setState("");
    setSelectedFlags([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setSortField(null);
    setSortDir("asc");
    setPage(1);
    // Re-run search with cleared state immediately
    setTimeout(() => {
      searchTax({ page: 1, pageSize: PAGE_SIZE })
        .then((data) => { setResults(data.results || []); setTotal(data.total || 0); })
        .catch(() => {});
      fetchFacets({}).then((data) => setFacets(data.facets)).catch(() => {});
    }, 0);
  };

  // Run search when filters change (debounced via button or Enter)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    runSearch(1);
    loadFacets();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-wrapper">
      {/* Header */}
      <div className="app-header">
        <h1>🔍 Tax Search & Analytics</h1>
        <p>Smart filing search for operations, compliance, and audit teams</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit}>
        <div className="search-bar-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder='Search by client, employer, state, or phrase (e.g., "jane smith w-2")'
            aria-label="Search tax filings"
            autoComplete="off"
          />
          <span className="search-icon" aria-hidden="true">⌕</span>

          {/* Autocomplete dropdown */}
          {showSuggestions && (
            <div className="autocomplete-dropdown" role="listbox">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="autocomplete-item"
                  role="option"
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Mode Selector */}
        <div className="mode-row">
          <label>Mode:</label>
          {SEARCH_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-btn${mode === m ? " active" : ""}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Filter Row */}
        <div className="filter-row">
          {/* Year */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            {YEARS.filter(Boolean).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Form */}
          <select
            value={form}
            onChange={(e) => setForm(e.target.value)}
            aria-label="Filter by form type"
          >
            <option value="">All Forms</option>
            {FORMS.filter(Boolean).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* State */}
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label="Filter by state"
          >
            <option value="">All States</option>
            {STATES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Flags */}
          <div className="flags-group" role="group" aria-label="Flag filters">
            {FLAG_OPTIONS.map((f) => (
              <label
                key={f.value}
                className={`flag-chip${selectedFlags.includes(f.value) ? ` selected ${f.value}` : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedFlags.includes(f.value)}
                  onChange={() => toggleFlag(f.value)}
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* Search + Clear */}
          <button type="submit" className="mode-btn active" style={{ marginLeft: "auto" }}>
            Search
          </button>
          <button type="button" className="clear-btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </form>

      {/* Facets Panel */}
      {facets && (
        <div className="facets-panel">
          <h3>Dataset Overview</h3>
          <div className="facets-grid">
            <div className="facet-group">
              <h4>Form Type</h4>
              {facets.formType.map((f) => (
                <div
                  key={f.key}
                  className="facet-item"
                  onClick={() => { setForm(f.key); setTimeout(() => runSearch(1), 0); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && (setForm(f.key), setTimeout(() => runSearch(1), 0))}
                >
                  {f.key} <span className="facet-count">{f.count}</span>
                </div>
              ))}
            </div>
            <div className="facet-group">
              <h4>Tax Year</h4>
              {facets.taxYear
                .sort((a, b) => b.key - a.key)
                .map((f) => (
                  <div
                    key={f.key}
                    className="facet-item"
                    onClick={() => { setYear(String(f.key)); setTimeout(() => runSearch(1), 0); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && (setYear(String(f.key)), setTimeout(() => runSearch(1), 0))}
                  >
                    {f.key} <span className="facet-count">{f.count}</span>
                  </div>
                ))}
            </div>
            <div className="facet-group">
              <h4>State</h4>
              {facets.state
                .sort((a, b) => b.count - a.count)
                .map((f) => (
                  <div
                    key={f.key}
                    className="facet-item"
                    onClick={() => { setState(f.key); setTimeout(() => runSearch(1), 0); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && (setState(f.key), setTimeout(() => runSearch(1), 0))}
                  >
                    {f.key} <span className="facet-count">{f.count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Result Count */}
      <div className="result-meta">
        <span>
          {loading ? "Searching…" : error ? (
            <span style={{ color: "#ef4444" }}>Error: {error}</span>
          ) : (
            <><strong>{total}</strong> result{total !== 1 ? "s" : ""}</>
          )}
        </span>
        {sortField && (
          <span>Sorted by <strong>{sortField}</strong> ({sortDir})</span>
        )}
      </div>

      {/* Results Grid */}
      <div className="results-table-wrapper">
        <table>
          <thead>
            <tr>
              {[
                { key: "clientName", label: "Client" },
                { key: "employerName", label: "Employer" },
                { key: "formType", label: "Form" },
                { key: "taxYear", label: "Year" },
                { key: "state", label: "State" },
                { key: "wages", label: "Wages" },
                { key: "flags", label: "Flags" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.key !== "flags" && handleSort(col.key)}
                  title={col.key !== "flags" ? `Sort by ${col.label}` : undefined}
                  aria-sort={
                    sortField === col.key
                      ? sortDir === "asc" ? "ascending" : "descending"
                      : undefined
                  }
                >
                  {col.label}
                  {sortField === col.key && (
                    <span aria-hidden="true"> {sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="loading-row">
                <td colSpan={7}>Loading…</td>
              </tr>
            ) : sortedResults.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="icon">📭</div>
                    <p>No results found. Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedResults.map((r) => (
                <tr key={r.id}>
                  <td>{r.clientName || "N/A"}</td>
                  <td>{r.employerName || <span className="badge badge-na">N/A</span>}</td>
                  <td>{r.formType || "N/A"}</td>
                  <td>{r.taxYear || "N/A"}</td>
                  <td>{r.state || "N/A"}</td>
                  <td>{formatWages(r.wages)}</td>
                  <td>
                    <FlagBadges
                      flags={r.flags}
                      ssn={r.ssn}
                      employerName={r.employerName}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => { const p = page - 1; setPage(p); runSearch(p); }}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            onClick={() => { const p = page + 1; setPage(p); runSearch(p); }}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
