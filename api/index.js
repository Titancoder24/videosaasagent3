require("dotenv").config();
require("express-async-errors");

const express = require("express");
const serverless = require("serverless-http");

const app = express();

/* =========================
   CORS — COMPREHENSIVE HANDLING
========================= */

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests without origin (e.g., Postman, curl)
  
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:4200",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
    "https://trialbyte-v3-frontend.vercel.app", // New frontend URL
  ].filter(Boolean);
  
  // Match any Vercel deployment (production, preview, etc.)
  const vercelRegex = /^https:\/\/.*\.vercel\.app$/i;
  
  if (allowedOrigins.includes(origin)) return true;
  if (vercelRegex.test(origin)) return true;
  
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    const extra = process.env.ADDITIONAL_ALLOWED_ORIGINS.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (extra.includes(origin)) return true;
  }
  
  return false;
};

// Helper to set CORS headers - ALWAYS sets headers for allowed origins
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin || req.get("origin");
  const allowed = isOriginAllowed(origin);
  
  console.log("[CORS] Setting headers for origin:", origin, "Allowed:", allowed);
  
  // CRITICAL: Always set headers for allowed origins
  if (allowed) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, X-CSRF-Token");
    res.setHeader("Access-Control-Max-Age", "600");
    console.log("[CORS] Headers set successfully for:", origin);
  } else {
    console.error("[CORS] Origin not allowed:", origin);
  }
};

// Universal CORS middleware - applies to ALL requests (FIRST - BEFORE ANYTHING ELSE)
app.use((req, res, next) => {
  const origin = req.headers.origin || req.get("origin");
  console.log("[CORS] Request:", req.method, req.path, "from origin:", origin);
  
  // CRITICAL: Handle preflight requests FIRST, before anything else
  if (req.method === "OPTIONS") {
    console.log("[CORS] Preflight request detected from:", origin);
    setCorsHeaders(req, res);
    console.log("[CORS] Preflight response sent for:", origin);
    return res.status(200).end();
  }
  
  // Set CORS headers for all other requests
  setCorsHeaders(req, res);
  
  // Intercept ALL response methods to ensure CORS headers are always set
  const originalEnd = res.end;
  const originalJson = res.json;
  const originalSend = res.send;
  const originalStatus = res.status;
  
  // Override end() to always set CORS headers
  res.end = function(...args) {
    setCorsHeaders(req, res);
    return originalEnd.apply(this, args);
  };
  
  // Override json() to always set CORS headers
  res.json = function(...args) {
    setCorsHeaders(req, res);
    return originalJson.apply(this, args);
  };
  
  // Override send() to always set CORS headers
  res.send = function(...args) {
    setCorsHeaders(req, res);
    return originalSend.apply(this, args);
  };
  
  next();
});

/* =========================
   BODY PARSING
========================= */

app.use(express.json());

/* =========================
   NORMALIZE DOUBLE SLASHES
========================= */

app.use((req, res, next) => {
  if (req.url.includes("//")) {
    req.url = req.url.replace(/([^:]\/)\/+/g, "$1");
  }
  next();
});

/* =========================
   EDGE STORE
========================= */

const { registerEdgeStoreRoutes } = require("../src/utils/edgeStore");
registerEdgeStoreRoutes(app);

/* =========================
   DATABASE
========================= */

const {
  connect_PgSQL_DB,
} = require("../src/infrastructure/PgDB/connect");

let dbConnectionPromise = null;

const ensureDbConnection = async () => {
  if (dbConnectionPromise) return dbConnectionPromise;

  try {
    const { pool } = require("../src/infrastructure/PgDB/connect");
    await pool.query("SELECT 1");
    return pool;
  } catch {}

  dbConnectionPromise = (async () => {
    return connect_PgSQL_DB();
  })();

  return dbConnectionPromise;
};

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  setCorsHeaders(req, res);
  res.status(200).json({
    status: "ok",
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   DB MIDDLEWARE
========================= */

app.use("/api", async (req, res, next) => {
  if (req.path === "/health") return next();

  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    setCorsHeaders(req, res);
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

/* =========================
   ROUTERS
========================= */

app.use("/api/v1/users", require("../src/routers/userRouter"));
app.use("/api/v1/roles", require("../src/routers/roleRouter"));
app.use("/api/v1/user-roles", require("../src/routers/userRoleRouter"));
app.use("/api/v1/pending-changes", require("../src/routers/pendingChangeRouter"));
app.use("/api/v1/user-activity", require("../src/routers/userActivityRouter"));
app.use("/api/v1/therapeutic", require("../src/routers/therapeuticRouter"));
app.use("/api/v1/drugs", require("../src/routers/drugRouter"));
app.use("/api/v1/queries", require("../src/routers/queryRouter"));
app.use("/api/v1/dropdown-management", require("../src/routers/dropdownManagementRouter"));

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  setCorsHeaders(req, res);
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

/* =========================
   SERVER / SERVERLESS
========================= */

const port = process.env.PORT || 5002;

if (process.env.NODE_ENV !== "test") {
  connect_PgSQL_DB(process.env.DATABASE_URL)
    .then(() => {
      app.listen(port, () =>
        console.log(`🚀 TrialByte Server running on port ${port}`)
      );
    })
    .catch(console.error);
}

module.exports = app;
module.exports.handler = serverless(app);
