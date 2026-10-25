import { and, eq, isNull, sql } from "drizzle-orm";
import { books, orderItems, orders } from "../db/schema.js";

// Stripe's minimum; stock stays reserved for this long before an unpaid order is cancelled
export const CHECKOUT_TTL_SECONDS = 30 * 60;

export const toCents = (price) => Math.round(Number(price) * 100);
export const fromCents = (cents) => (cents / 100).toFixed(2);

// What a stock change touched, for invalidateBooks: the books, and whether any of them sold
// out or came back into stock
export const NO_STOCK_CHANGE = { bookIds: [], availabilityChanged: false };

// Puts the ordered quantities back on the shelf
export async function restock(tx, orderId) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  let availabilityChanged = false;
  for (const item of items) {
    const [book] = await tx
      .update(books)
      .set({ stock: sql`${books.stock} + ${item.quantity}` })
      .where(eq(books.id, item.bookId))
      .returning({ stock: books.stock });
    // Exactly the quantity we put back means it was at 0
    if (book.stock === item.quantity) availabilityChanged = true;
  }
  return { bookIds: items.map((item) => item.bookId), availabilityChanged };
}

// Cancels an order only if it's still pending, so replays and races can't restock twice.
// Pass sessionId (null included) to also require that the order's Stripe session is still
// that one. Returns NO_STOCK_CHANGE when the order had already moved on.
export async function cancelAndRestock(tx, orderId, { sessionId } = {}) {
  const where = [eq(orders.id, orderId), eq(orders.status, "pending")];
  if (sessionId !== undefined) {
    where.push(sessionId === null ? isNull(orders.stripeSessionId) : eq(orders.stripeSessionId, sessionId));
  }
  const [cancelled] = await tx
    .update(orders)
    .set({ status: "cancelled" })
    .where(and(...where))
    .returning({ id: orders.id });
  return cancelled ? restock(tx, cancelled.id) : NO_STOCK_CHANGE;
}
