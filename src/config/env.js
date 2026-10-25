import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  // Connections per process. Every API instance and the worker open their own pool, so
  // (instances + 1) x this must stay under Postgres's max_connections (100 by default),
  // or go through PgBouncer.
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  // Number of proxies (load balancer, CDN) in front of the API, so req.ip is the client's
  // address rather than the proxy's. 0 when clients connect directly, as in local dev.
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  // Optional cache; the API works without it, just with more database load
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY must be a Stripe secret key (sk_...)"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),
  // Where Stripe sends customers back to after checkout
  CLIENT_URL: z.url().default("http://localhost:5173"),
  CURRENCY: z.string().length(3).toLowerCase().default("usd")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
