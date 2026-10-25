// Background worker, run alongside the API: npm run worker (or worker:dev)
// It shares the database and src/lib with the API but deploys, scales and fails on its own.
import { pool } from "./db/index.js";
import { closeCache, connectCache } from "./lib/cache.js";
import { logger } from "./lib/logger.js";
import { sweepStaleOrders } from "./lib/order-sweeper.js";

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

let timer;
let current = Promise.resolve();
let stopping = false;

// The next sweep is scheduled only after this one finishes, so sweeps never overlap
async function sweep() {
  try {
    await sweepStaleOrders();
  } catch (err) {
    // e.g. the database is down; try again on the next tick
    logger.error({ err }, "Order sweep failed");
  }
  if (!stopping) timer = setTimeout(run, SWEEP_INTERVAL_MS);
}

function run() {
  current = sweep();
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "Worker stopping");
  clearTimeout(timer);
  await current;
  await Promise.allSettled([pool.end(), closeCache()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "Unhandled promise rejection");
  process.exit(1);
});

connectCache();
logger.info({ intervalMinutes: SWEEP_INTERVAL_MS / 60000 }, "Worker started");
// Sweep right away, so anything that went stale while the worker was down is settled now
run();
