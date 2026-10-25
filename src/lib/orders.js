import { and, eq, sql } from "drizzle-orm";
import { books, orderItems, orders } from "../db/schema.js";

// Stripe's minimum; stock stays reserved for this long before an unpaid order is cancelled
export const CHECKOUT_TTL_SECONDS = 30 * 60;

export const toCents = (price) => Math.round(Number(price) * 100);
export const fromCents = (cents) => (cents / 100).toFixed(2);

// Puts the ordered quantities back on the shelf; returns the ids of the books it touched
export async function restock(tx, orderId) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await tx
      .update(books)
      .set({ stock: sql`${books.stock} + ${item.quantity}` })
      .where(eq(books.id, item.bookId));
  }
  return items.map((item) => item.bookId);
}

// Cancels an order only if it's still pending, so replays and races can't restock twice.
// Returns the restocked book ids, or [] when the order had already moved on.
export async function cancelAndRestock(tx, orderId) {
  const [cancelled] = await tx
    .update(orders)
    .set({ status: "cancelled" })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  return cancelled ? restock(tx, cancelled.id) : [];
}
