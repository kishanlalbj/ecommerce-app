import pino from "pino";
import { env } from "../config/env.js";

const isDev = env.NODE_ENV === "development";

// Dev: colorized, human-readable lines. Prod: one JSON object per line for log shippers.
export const logger = pino({
  level: env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
    censor: "[REDACTED]"
  },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" }
    }
  })
});
