/**
 * server.js — Tax Search & Analytics Platform
 *
 * Connects to MongoDB Atlas, then starts the Express HTTP server.
 */

"use strict";

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const swaggerUi  = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const connectDB  = require("./db/connect");
const searchRoutes = require("./routes/search");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  _res.on("finish", () => {
    console.log(`${req.method} ${req.path} → ${_res.statusCode}`);
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Root — API info
app.get("/", (_req, res) => {
  res.json({
    name: "Tax Search & Analytics API",
    status: "running",
    docs: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      health:  "GET /health",
      search:  "GET /api/search",
      facets:  "GET /api/facets",
      suggest: "GET /api/suggest?prefix=<text>",
    },
    ui: "http://localhost:3000",
  });
});

// Health check
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Search, facets, suggest
app.use("/api", searchRoutes);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Tax Search API Docs",
  swaggerOptions: {
    defaultModelsExpandDepth: -1,
    docExpansion: "list",
    filter: true,
    tryItOutEnabled: true,
  },
}));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found", detail: "The requested endpoint does not exist" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    detail: err.message || "An unexpected error occurred",
  });
});

// ── Start: connect DB first, then listen ─────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Tax Search API running on http://localhost:${PORT}`);
    console.log(`  Swagger UI  → http://localhost:${PORT}/api-docs`);
    console.log(`  Frontend UI → http://localhost:3000`);
  });
});

module.exports = app;
