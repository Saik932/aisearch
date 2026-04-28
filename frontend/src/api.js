/**
 * API client — thin wrapper around fetch calls to the backend.
 * BASE_URL falls back to the CRA proxy (same origin) in development.
 */

const BASE_URL = process.env.REACT_APP_API_URL || "";

export async function searchTax(params) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    if (Array.isArray(val)) {
      val.forEach((v) => qs.append(key, v));
    } else {
      qs.append(key, val);
    }
  });

  const res = await fetch(`${BASE_URL}/api/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

export async function fetchFacets(filters = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    if (Array.isArray(val)) val.forEach((v) => qs.append(key, v));
    else qs.append(key, val);
  });

  const res = await fetch(`${BASE_URL}/api/facets?${qs.toString()}`);
  if (!res.ok) throw new Error(`Facets failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSuggestions(prefix, scope = "all") {
  if (!prefix || prefix.trim().length < 1) return [];
  const qs = new URLSearchParams({ prefix, scope });
  const res = await fetch(`${BASE_URL}/api/suggest?${qs.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions || [];
}
