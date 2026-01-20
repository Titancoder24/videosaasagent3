require("dotenv").config();
require("express-async-errors");
const express = require("express");
const app = express();
const cors = require("cors");
const serverless = require("serverless-http");
const { registerEdgeStoreRoutes } = require("./src/utils/edgeStore");

//connectDB
const { connect_PgSQL_DB } = require("./src/infrastructure/PgDB/connect");

//routers
const userRouter = require("./src/routers/userRouter");
const roleRouter = require("./src/routers/roleRouter");
const userRoleRouter = require("./src/routers/userRoleRouter");
const pendingChangeRouter = require("./src/routers/pendingChangeRouter");
const userActivityRouter = require("./src/routers/userActivityRouter");
const therapeuticRouter = require("./src/routers/therapeuticRouter");
const drugRouter = require("./src/routers/drugRouter");
const queryRouter = require("./src/routers/queryRouter");
const dropdownManagementRouter = require("./src/routers/dropdownManagementRouter");

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000", // React default
      "http://localhost:3001", // Alternative React port
      "http://localhost:5173", // Vite default
      "http://localhost:4200", // Angular default
      "http://127.0.0.1:3000", // Alternative localhost format
      "http://127.0.0.1:5173", // Alternative localhost format
      "https://trialbyte-frontend.98h6kpq3ehd7c.us-east-1.cs.amazonlightsail.com", // AWS Lightsail
      "https://trialbyte-nextjs.onrender.com", // Render frontend
      process.env.FRONTEND_URL, // Production frontend URL from env
    ].filter(Boolean);

    const vercelRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

    const isAllowedOrigin = (candidate) => {
      console.log("[cors] evaluating origin", candidate);
      if (!candidate) {
        console.log("[cors] allowing request without origin header");
        return true;
      }
      if (allowedOrigins.includes(candidate)) {
        console.log("[cors] matched explicit allowlist", candidate);
        return true;
      }
      if (vercelRegex.test(candidate)) {
        console.log("[cors] allowing Vercel preview/production origin", candidate);
        return true;
      }
      if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
        const extra = process.env.ADDITIONAL_ALLOWED_ORIGINS.split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        if (extra.includes(candidate)) {
          console.log("[cors] matched ADDITIONAL_ALLOWED_ORIGINS", candidate);
          return true;
        }
      }
      return false;
    };

    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.error("[cors] blocked origin", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
    "Pragma",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600, // Cache preflight response for 10 minutes
};

// extra packages
app.use(express.json());

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Apply CORS middleware
app.use(cors(corsOptions));

registerEdgeStoreRoutes(app);

//routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/user-roles", userRoleRouter);
app.use("/api/v1/pending-changes", pendingChangeRouter);
app.use("/api/v1/user-activity", userActivityRouter);
app.use("/api/v1/therapeutic", therapeuticRouter);
app.use("/api/v1/drugs", drugRouter);
app.use("/api/v1/queries", queryRouter);
app.use("/api/v1/dropdown-management", dropdownManagementRouter);

// basic error handler for tests and dev
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

const port = process.env.PORT || 5002;

const start = async () => {
  try {
    await connect_PgSQL_DB(process.env.DATABASE_URL);
    app.listen(port, () =>
      console.log(`TrialByte Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}

module.exports = app;
module.exports.handler = serverless(app);