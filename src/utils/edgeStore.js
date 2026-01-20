const { initEdgeStore } = require("@edgestore/server");
const { createEdgeStoreExpressHandler } = require("@edgestore/server/adapters/express");

const createEdgeStoreRouter = (edgeStoreInstance) => {
  console.log("[edgestore] createEdgeStoreRouter invoked");
  return edgeStoreInstance.router({
    trialOutcomeAttachments: edgeStoreInstance.fileBucket({
      maxSize: 1024 * 1024 * 50,
      accept: [
        "image/*",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
    }),
  });
};

const buildEdgeStoreExpressHandler = () => {
  console.log("[edgestore] buildEdgeStoreExpressHandler invoked");
  const accessKey = process.env.EDGE_STORE_ACCESS_KEY;
  const secretKey = process.env.EDGE_STORE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    console.warn("[edgestore] Missing EDGE_STORE_ACCESS_KEY or EDGE_STORE_SECRET_KEY");
    return null;
  }

  const edgeStoreInstance = initEdgeStore.create({
    accessKey,
    secretKey,
  });

  const router = createEdgeStoreRouter(edgeStoreInstance);

  const handler = createEdgeStoreExpressHandler({
    router,
  });

  return handler;
};

const parseCookies = (cookieHeader = "") => {
  console.log("[edgestore] parseCookies invoked");
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) {
        return acc;
      }
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1);
      try {
        acc[key] = decodeURIComponent(value);
      } catch (error) {
        console.warn("[edgestore] Failed to decode cookie value", error);
        acc[key] = value;
      }
      return acc;
    }, {});
};

const registerEdgeStoreRoutes = (app) => {
  console.log("[edgestore] registerEdgeStoreRoutes invoked");
  const edgeStoreHandler = buildEdgeStoreExpressHandler();

  if (!edgeStoreHandler) {
    console.warn("[edgestore] EdgeStore handler not created. Skipping route registration.");
    return;
  }

  app.use((req, res, next) => {
    if (!req.cookies) {
      req.cookies = parseCookies(req.headers?.cookie || "");
    }
    next();
  });

  app.use("/api/edgestore", async (req, res, next) => {
    console.log("[edgestore] request received", { method: req.method, originalUrl: req.originalUrl });
    try {
      await edgeStoreHandler(req, res);
    } catch (error) {
      console.error("[edgestore] handler failed", error);
      next(error);
    }
  });
};

module.exports = {
  registerEdgeStoreRoutes,
};


