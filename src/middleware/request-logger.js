import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const isDev = env.NODE_ENV === "development";

export const requestLogger = pinoHttp({
  logger,
  // Reuse an upstream request id (e.g. from a load balancer) when present
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] ?? randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(responseTime)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  autoLogging: { ignore: (req) => req.url === "/health" },
  // Full req/res objects are noise in the terminal; keep them in prod JSON
  ...(isDev && {
    serializers: {
      req: (req) => ({ id: req.id }),
      res: () => undefined
    }
  })
});
