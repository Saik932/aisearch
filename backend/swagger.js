/**
 * swagger.js
 * OpenAPI 3.0 specification for the Tax Search & Analytics API.
 * Served at http://localhost:4000/api-docs
 */

"use strict";

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tax Search & Analytics API",
      version: "1.0.0",
      description:
        "Smart tax-document search for operations, compliance, and audit teams. " +
        "Supports basic, semantic, fuzzy, wildcard, and boolean search modes " +
        "combined with structured filters.",
    },
    servers: [{ url: "http://localhost:4000", description: "Local development server" }],
    tags: [
      { name: "Search",  description: "Unified search endpoint" },
      { name: "Facets",  description: "Faceted aggregation / drill-down" },
      { name: "Suggest", description: "Autocomplete / suggest-as-you-type" },
      { name: "Health",  description: "Server health check" },
    ],
    components: {
      schemas: {
        TaxRecord: {
          type: "object",
          properties: {
            id:           { type: "string",  example: "1" },
            clientName:   { type: "string",  example: "John Smith" },
            employerName: { type: "string",  example: "TechStart Inc" },
            formType:     { type: "string",  example: "W-2", enum: ["W-2", "1099"] },
            taxYear:      { type: "integer", example: 2022 },
            state:        { type: "string",  example: "CA" },
            wages:        { type: "number",  example: 95000 },
            ssn:          { type: "string",  example: "123-45-6789" },
            flags: {
              type: "array",
              items: { type: "string", enum: ["missing_ssn", "missing_employer", "high_wage"] },
              example: [],
            },
          },
        },
        SearchResponse: {
          type: "object",
          properties: {
            total:    { type: "integer", example: 20 },
            page:     { type: "integer", example: 1 },
            pageSize: { type: "integer", example: 10 },
            results:  { type: "array", items: { $ref: "#/components/schemas/TaxRecord" } },
          },
        },
        FacetBucket: {
          type: "object",
          properties: {
            key:   { oneOf: [{ type: "string" }, { type: "integer" }], example: "W-2" },
            count: { type: "integer", example: 14 },
          },
        },
        FacetsResponse: {
          type: "object",
          properties: {
            total: { type: "integer", example: 20 },
            facets: {
              type: "object",
              properties: {
                formType: { type: "array", items: { $ref: "#/components/schemas/FacetBucket" } },
                taxYear:  { type: "array", items: { $ref: "#/components/schemas/FacetBucket" } },
                state:    { type: "array", items: { $ref: "#/components/schemas/FacetBucket" } },
              },
            },
          },
        },
        SuggestResponse: {
          type: "object",
          properties: {
            suggestions: { type: "array", items: { type: "string" }, example: ["Jane Doe", "James Taylor"] },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error:  { type: "string", example: "Invalid request parameters" },
            detail: { type: "string", example: "'page' must be a positive integer" },
          },
        },
      },
      // Reusable filter parameters
      parameters: {
        queryParam: {
          name: "query", in: "query", required: false,
          description: "Free-text search input",
          schema: { type: "string", example: "John Smith" },
        },
        modeParam: {
          name: "mode", in: "query", required: false,
          description: "Search mode",
          schema: { type: "string", enum: ["basic", "semantic", "fuzzy", "wildcard", "boolean"], default: "basic" },
        },
        targetFieldParam: {
          name: "targetField", in: "query", required: false,
          description: "For fuzzy mode — restrict matching to a single field",
          schema: { type: "string", enum: ["clientName", "employerName"] },
        },
        missingSSNParam: {
          name: "missingSSN", in: "query", required: false,
          description: "Return only records with missing or empty SSN",
          schema: { type: "boolean", example: true },
        },
        missingEmployerParam: {
          name: "missingEmployer", in: "query", required: false,
          description: "Return only records with missing employer name",
          schema: { type: "boolean", example: true },
        },
        wagesGTParam: {
          name: "wagesGreaterThan", in: "query", required: false,
          description: "Return records where wages are strictly above this value",
          schema: { type: "number", example: 1000000 },
        },
        wagesMinParam: {
          name: "wagesMin", in: "query", required: false,
          description: "Wage band lower bound (inclusive)",
          schema: { type: "number", example: 50000 },
        },
        wagesMaxParam: {
          name: "wagesMax", in: "query", required: false,
          description: "Wage band upper bound (inclusive)",
          schema: { type: "number", example: 100000 },
        },
        stateParam: {
          name: "state", in: "query", required: false,
          description: "Two-letter US state code",
          schema: { type: "string", example: "CA", enum: ["CA", "NY", "TX", "FL", "WA"] },
        },
        taxYearParam: {
          name: "taxYear", in: "query", required: false,
          description: "Four-digit tax year",
          schema: { type: "integer", example: 2022 },
        },
        employerNameParam: {
          name: "employerName", in: "query", required: false,
          description: "Employer name substring match",
          schema: { type: "string", example: "Acme Corp" },
        },
        formTypeParam: {
          name: "formType", in: "query", required: false,
          description: "Tax form type",
          schema: { type: "string", enum: ["W-2", "1099"] },
        },
        flagsParam: {
          name: "flags", in: "query", required: false,
          description: "Filter by flag (repeatable for multiple flags)",
          schema: { type: "string", enum: ["missing_ssn", "missing_employer", "high_wage"] },
        },
        pageParam: {
          name: "page", in: "query", required: false,
          description: "Page number (1-based)",
          schema: { type: "integer", default: 1, minimum: 1 },
        },
        pageSizeParam: {
          name: "pageSize", in: "query", required: false,
          description: "Results per page (max 200)",
          schema: { type: "integer", default: 50, minimum: 1, maximum: 200 },
        },
      },
    },
    paths: {
      "/": {
        get: {
          tags: ["Health"],
          summary: "API root — lists available endpoints",
          responses: {
            200: { description: "API info and endpoint list" },
          },
        },
      },
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: {
            200: {
              description: "Server is running",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status:    { type: "string", example: "ok" },
                      timestamp: { type: "string", example: "2026-04-29T10:00:00.000Z" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/search": {
        get: {
          tags: ["Search"],
          summary: "Unified search endpoint",
          description:
            "Search tax filings using one of five modes:\n\n" +
            "- **basic** — case-insensitive substring match across client, employer, state, form\n" +
            "- **semantic** — natural-language phrases mapped to concepts (e.g. *'tech companies'*, *'high income tax forms'*)\n" +
            "- **fuzzy** — handles typos and OCR errors (e.g. *'Jhon Smth'* → John Smith)\n" +
            "- **wildcard** — prefix/glob patterns using `*` and `?` (e.g. *'Sm\\*'*)\n" +
            "- **boolean** — OR / AND logic (e.g. *'Smith OR Johnson'*)\n\n" +
            "All modes can be combined with any structured filter.",
          parameters: [
            { $ref: "#/components/parameters/queryParam" },
            { $ref: "#/components/parameters/modeParam" },
            { $ref: "#/components/parameters/targetFieldParam" },
            { $ref: "#/components/parameters/missingSSNParam" },
            { $ref: "#/components/parameters/missingEmployerParam" },
            { $ref: "#/components/parameters/wagesGTParam" },
            { $ref: "#/components/parameters/wagesMinParam" },
            { $ref: "#/components/parameters/wagesMaxParam" },
            { $ref: "#/components/parameters/stateParam" },
            { $ref: "#/components/parameters/taxYearParam" },
            { $ref: "#/components/parameters/employerNameParam" },
            { $ref: "#/components/parameters/formTypeParam" },
            { $ref: "#/components/parameters/flagsParam" },
            { $ref: "#/components/parameters/pageParam" },
            { $ref: "#/components/parameters/pageSizeParam" },
          ],
          responses: {
            200: {
              description: "Search results with pagination metadata",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/SearchResponse" } },
              },
            },
            400: {
              description: "Invalid request parameters",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/facets": {
        get: {
          tags: ["Facets"],
          summary: "Faceted aggregation",
          description:
            "Groups the dataset by **formType**, **taxYear**, and **state**, returning counts for each bucket. " +
            "Accepts the same filter parameters as `/api/search` (no query/mode). " +
            "Use this to get a high-level overview before narrowing down with filters.",
          parameters: [
            { $ref: "#/components/parameters/missingSSNParam" },
            { $ref: "#/components/parameters/missingEmployerParam" },
            { $ref: "#/components/parameters/wagesMinParam" },
            { $ref: "#/components/parameters/wagesMaxParam" },
            { $ref: "#/components/parameters/stateParam" },
            { $ref: "#/components/parameters/taxYearParam" },
            { $ref: "#/components/parameters/employerNameParam" },
            { $ref: "#/components/parameters/formTypeParam" },
            { $ref: "#/components/parameters/flagsParam" },
          ],
          responses: {
            200: {
              description: "Facet buckets and counts",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/FacetsResponse" } },
              },
            },
            400: {
              description: "Invalid request parameters",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/suggest": {
        get: {
          tags: ["Suggest"],
          summary: "Autocomplete / suggest-as-you-type",
          description:
            "Returns up to 10 suggestions for a given text prefix. " +
            "First returns exact prefix matches, then fills remaining slots with fuzzy near-matches. " +
            "Use this to power the search box autocomplete dropdown.",
          parameters: [
            {
              name: "prefix", in: "query", required: true,
              description: "Partial text typed by the user",
              schema: { type: "string", example: "Jan" },
            },
            {
              name: "scope", in: "query", required: false,
              description: "Which fields to search for suggestions",
              schema: { type: "string", enum: ["client", "employer", "all"], default: "all" },
            },
          ],
          responses: {
            200: {
              description: "List of autocomplete suggestions",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/SuggestResponse" } },
              },
            },
            400: {
              description: "Missing or invalid parameters",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // paths defined inline above
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
