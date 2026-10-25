import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { logger } from "./logger.js";
import { CHECKOUT_TTL_SECONDS } from "./orders.js";
import { onPaymentAbandoned, onPaymentSucceeded, releaseOrder } from "./payments.js";
import { stripe } from "./stripe.js";

// Safety net for the Stripe webhook. Every pending order holds stock, and normally the
// webhook settles it within the checkout window. Two kinds slip through and would hold
// their books forever: orders whose checkout never started (no session, so no webhook)
// and orders whose webhook was missed. The sweep finds them by asking Postgres, so it
// keeps no state of its own and picks up where it left off after any crash.

// Webhooks get this long after the session expires before the sweep steps in
const GRACE_SECONDS = 5 * 60;
const BATCH_SIZE = 100;

// Settles one stale order; returns what happened, for the summary log
async function settle(order) {
  if (!order.stripeSessionId) {
    return (await releaseOrder(order.id)) ? "cancelled" : "skipped";
  }

  // Ask Stripe how the checkout actually ended, then apply it exactly as the webhook would
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.status === "expired") {
    return (await onPaymentAbandoned(session)) ? "cancelled" : "skipped";
  }
  if (session.status === "complete") {
    // "unpaid": a delayed payment (bank debit) is still processing; its async webhook settles it
    return (await onPaymentSucceeded(session)) === "paid" ? "paid" : "skipped";
  }
  // Still open: shouldn't happen past the window, so leave it for the next sweep
  return "skipped";
}

export async function sweepStaleOrders() {
  const cutoff = new Date(Date.now() - (CHECKOUT_TTL_SECONDS + GRACE_SECONDS) * 1000);
  const counts = { cancelled: 0, paid: 0, skipped: 0, failed: 0 };

  // Page through by id so orders that are legitimately still pending (delayed payments)
  // can't fill every batch and starve the ones behind them
  let lastId = 0;
  for (;;) {
    const batch = await db
      .select({ id: orders.id, stripeSessionId: orders.stripeSessionId })
      .from(orders)
      .where(and(eq(orders.status, "pending"), lt(orders.createdAt, cutoff), gt(orders.id, lastId)))
      .orderBy(asc(orders.id))
      .limit(BATCH_SIZE);

    for (const order of batch) {
      try {
        counts[await settle(order)] += 1;
      } catch (err) {
        // One Stripe or database error shouldn't stop the rest; the next sweep retries it
        counts.failed += 1;
        logger.error({ err, orderId: order.id }, "Couldn't settle stale order");
      }
    }

    if (batch.length < BATCH_SIZE) break;
    lastId = batch.at(-1).id;
  }

  if (counts.cancelled || counts.paid || counts.failed) {
    logger.info(counts, "Order sweep finished");
  } else {
    logger.debug(counts, "Order sweep finished");
  }
  return counts;
}
