import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  // When every connection is busy, fail the request after 5s instead of queueing it forever
  connectionTimeoutMillis: 5000
});

export const db = drizzle(pool, { schema });
