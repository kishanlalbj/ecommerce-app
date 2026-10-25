import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";
import { invalidateBooks } from "./book-cache.js";
import { logger } from "./logger.js";
import { cancelAndRestock } from "./orders.js";
import { stripe } from "./stripe.js";

// Settle orders from Stripe Checkout sessions. Called by the webhook with the session Stripe
// sent, and by the order sweeper with one it fetched itself. Both may see the same session
// more than once, so every write is conditional on the order still being pending.
//
// Orders are found by session id, not metadata: a session whose id never made it onto an
// order (its transaction rolled back) must not touch that order.

// Cancels a pending order and puts its books back. Returns true if this call cancelled it.
export async function releaseOrder(orderId) {
  const change = await db.transaction((tx) => cancelAndRestock(tx, orderId));
  // After the commit, as in the orders routes
  await invalidateBooks(change);
  return change.bookIds.length > 0;
}

// Also runs for async_payment_succeeded. Delayed methods (bank debits) complete the session
// as "unpaid" first; the order stays pending until the async event settles it.
// Returns "paid", "unpaid", "duplicate" or "refunded".
export async function onPaymentSucceeded(session) {
  if (session.payment_status !== "paid") return "unpaid";

  const [paid] = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), stripePaymentIntentId: session.payment_intent })
    .where(and(eq(orders.stripeSessionId, session.id), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  if (paid) {
    logger.info({ orderId: paid.id, sessionId: session.id }, "Order paid");
    return "paid";
  }

  // A replay of a payment we already recorded
  const [order] = await db
    .select({ id: orders.id, stripePaymentIntentId: orders.stripePaymentIntentId })
    .from(orders)
    .where(eq(orders.stripeSessionId, session.id));
  if (order?.stripePaymentIntentId === session.payment_intent) return "duplicate";

  // Paid for an order that was cancelled meanwhile (or never saved): give the money back
  await stripe.refunds.create(
    { payment_intent: session.payment_intent },
    { idempotencyKey: `session-${session.id}-refund` }
  );
  logger.warn({ orderId: order?.id, sessionId: session.id }, "Refunded payment for an order that wasn't pending");
  return "refunded";
}

// The session expired unpaid, or a delayed payment failed: release the books.
// Returns true if this call cancelled the order.
export async function onPaymentAbandoned(session) {
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.stripeSessionId, session.id));
  if (!order || !(await releaseOrder(order.id))) return false;

  logger.info({ orderId: order.id, sessionId: session.id }, "Unpaid order cancelled and restocked");
  return true;
}
