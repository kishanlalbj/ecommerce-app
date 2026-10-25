import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// Redis holds disposable copies; Postgres is always the source of truth.
// Every helper fails open: if Redis is down or slow to come back, requests go straight
// to the database instead of erroring or waiting.

const client = createClient({
  url: env.REDIS_URL,
  // Without this, commands sent while disconnected queue up and the request hangs
  disableOfflineQueue: true,
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: (retries) => Math.min(retries * 500, 5000)
  }
});

// "error" fires on every failed reconnect attempt; log once per outage
let down = false;
client.on("error", (err) => {
  if (down) return;
  down = true;
  // Connection refusals arrive as an AggregateError with a code but an empty message
  logger.warn({ err: err.message || err.code }, "Redis unavailable, serving from the database");
});
client.on("ready", () => {
  down = false;
  logger.info("Redis connected");
});

export function connectCache() {
  // Not awaited by callers: the server starts whether or not Redis is up
  client.connect().catch(() => {});
}

export async function closeCache() {
  if (client.isOpen) await client.close();
}

// Cache-aside: return the cached value for `key`, or run `load`, store its result for
// `ttlSeconds`, and return it. `load` must return something JSON-serializable.
// Resolves to { value, status }, status being HIT, MISS, or BYPASS when Redis is unavailable.
export async function cached(key, ttlSeconds, load) {
  if (!client.isReady) return { value: await load(), status: "BYPASS" };

  try {
    const hit = await client.get(key);
    if (hit !== null) {
      logger.debug({ key }, "cache hit");
      return { value: JSON.parse(hit), status: "HIT" };
    }
  } catch (err) {
    logger.warn({ err: err.message, key }, "Cache read failed");
  }

  logger.debug({ key }, "cache miss");
  const value = await load();
  // Not awaited: the response doesn't need to wait for the write
  client
    .set(key, JSON.stringify(value), { expiration: { type: "EX", value: ttlSeconds } })
    .catch((err) => logger.warn({ err: err.message, key }, "Cache write failed"));
  return { value, status: "MISS" };
}

// Version keys: put getVersion(name) in a family of keys, and bump the version with
// invalidate({ versions: [name] }) to make every existing key in that family unreachable
// at once. The orphans expire on their TTL.
export async function getVersion(name) {
  if (!client.isReady) return null;
  try {
    return (await client.get(`${name}:version`)) ?? "0";
  } catch {
    return null;
  }
}

// Removes keys and bumps versions. A failure here only means data stays stale until its
// TTL, so it's logged rather than failing a request whose database write already succeeded.
export async function invalidate({ keys = [], versions = [] }) {
  if (!client.isReady) return;
  try {
    const multi = client.multi();
    if (keys.length) multi.del(keys);
    for (const name of versions) multi.incr(`${name}:version`);
    await multi.exec();
  } catch (err) {
    logger.warn({ err: err.message, keys, versions }, "Cache invalidation failed");
  }
}
