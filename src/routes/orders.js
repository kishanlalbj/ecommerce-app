import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Router } from "express";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { addresses, books, orderItems, orders } from "../db/schema.js";
import { invalidateBooks } from "../lib/book-cache.js";
import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { logger } from "../lib/logger.js";
import {
  CHECKOUT_TTL_SECONDS,
  NO_STOCK_CHANGE,
  cancelAndRestock,
  fromCents,
  restock,
  toCents
} from "../lib/orders.js";
import { stripe } from "../lib/stripe.js";
import { idParams } from "../schemas/common.js";
import { createOrderSchema, statusSchema } from "../schemas/orders.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

// Which status changes a store manager may make
const NEXT_STATUSES = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: []
};

const isAdmin = (req) => req.user.role === "admin";

async function findOrder(req) {
  return db.query.orders.findFirst({
    // Customers can only ever see their own orders
    where: isAdmin(req)
      ? eq(orders.id, req.params.id)
      : and(eq(orders.id, req.params.id), eq(orders.userId, req.user.id)),
    with: {
      items: { with: { book: { columns: { id: true, title: true, isbn: true, coverImageUrl: true } } } },
      shippingAddress: true
    }
  });
}

// Closes an order's Stripe session so it can't be paid after we cancel the order.
// Throws 409 if the customer already paid (the webhook just hasn't landed yet).
async function closeCheckout(sessionId) {
  let { status } = await stripe.checkout.sessions.retrieve(sessionId);
  if (status === "open") {
    try {
      await stripe.checkout.sessions.expire(sessionId);
      return;
    } catch (error) {
      // Paid between the two calls
      ({ status } = await stripe.checkout.sessions.retrieve(sessionId));
      if (status !== "complete") throw error;
    }
  }
  if (status === "complete") throw conflict("This order has already been paid");
}

// The checkout URL of an order's existing session, while the customer can still use it
async function openCheckoutUrl(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "open") return session.url;
  // The webhook will mark it paid or cancel it shortly
  throw conflict(
    session.status === "complete"
      ? "This order has already been paid"
      : "The payment window for this order has closed"
  );
}

// Stripe calls in these routes run outside any transaction. A call can take a second, and a
// transaction holds a pooled connection (and its row locks) the whole time, so a few dozen
// customers paying at once would leave no connections for anyone else. Instead the final
// write is conditional on the state that was checked, and a race shows up as 0 rows updated.

// Cancels a pending order and puts its books back, closing its checkout first so it can't
// be paid afterwards. The cancel requires the order to still have the session we closed:
// a "Pay" click may have attached a new one in between.
async function cancelPending(order) {
  if (order.stripeSessionId) await closeCheckout(order.stripeSessionId);
  const change = await db.transaction((tx) =>
    cancelAndRestock(tx, order.id, { sessionId: order.stripeSessionId })
  );
  if (!change.bookIds.length) {
    const [current] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, order.id));
    // The webhook or the sweeper got there first, which is the same outcome
    if (current.status !== "cancelled") throw conflict("The order changed while cancelling it; please try again");
  }
  await invalidateBooks(change);
}

export const ordersRouter = Router();
ordersRouter.use(authenticate);

// Customers place orders; admins manage the store and don't buy through it
ordersRouter.post(
  "/",
  requireRole("customer"),
  validate({ body: createOrderSchema }),
  async (req, res) => {
    const { shippingAddressId } = req.body;

    // Merge duplicate lines for the same book
    const quantities = new Map();
    for (const { bookId, quantity } of req.body.items) {
      quantities.set(bookId, (quantities.get(bookId) ?? 0) + quantity);
    }
    const bookIds = [...quantities.keys()];

    const created = await db.transaction(async (tx) => {
      const [address] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(and(eq(addresses.id, shippingAddressId), eq(addresses.userId, req.user.id)));
      if (!address) throw badRequest("Shipping address not found");

      // Lock the rows so two orders can't both buy the last copy
      const rows = await tx
        .select({ id: books.id, title: books.title, price: books.price, stock: books.stock })
        .from(books)
        .where(inArray(books.id, bookIds))
        .for("update");

      if (rows.length !== bookIds.length) {
        const found = new Set(rows.map((b) => b.id));
        throw badRequest(`Books not found: ${bookIds.filter((id) => !found.has(id)).join(", ")}`);
      }

      let totalCents = 0;
      for (const book of rows) {
        const quantity = quantities.get(book.id);
        if (book.stock < quantity) {
          throw conflict(`Only ${book.stock} left of "${book.title}"`);
        }
        totalCents += toCents(book.price) * quantity;
      }

      const [order] = await tx
        .insert(orders)
        .values({ userId: req.user.id, shippingAddressId, totalAmount: fromCents(totalCents) })
        .returning({ id: orders.id });

      // Prices come from the database, never from the client
      await tx.insert(orderItems).values(
        rows.map((book) => ({
          orderId: order.id,
          bookId: book.id,
          quantity: quantities.get(book.id),
          unitPrice: book.price
        }))
      );

      for (const book of rows) {
        await tx
          .update(books)
          .set({ stock: sql`${books.stock} - ${quantities.get(book.id)}` })
          .where(eq(books.id, book.id));
      }

      return {
        id: order.id,
        // Did this order buy the last copy of anything?
        stockChange: { bookIds, availabilityChanged: rows.some((book) => book.stock === quantities.get(book.id)) }
      };
    });
    // Cached book pages show stock, so stock changes clear them. This runs after the commit:
    // clearing inside the transaction would let a concurrent read cache the old stock right
    // back. Same for the cancel and status routes below.
    const { id: orderId, stockChange } = created;
    await invalidateBooks(stockChange);

    req.params.id = orderId;
    res.status(201).json(await findOrder(req));
  }
);

// Customers see their own orders; admins see every order
ordersRouter.get("/", async (req, res) => {
  const rows = await db.query.orders.findMany({
    where: isAdmin(req) ? undefined : eq(orders.userId, req.user.id),
    orderBy: desc(orders.createdAt),
    with: { items: { with: { book: { columns: { id: true, title: true, coverImageUrl: true } } } } }
  });
  res.json(rows);
});

ordersRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  const order = await findOrder(req);
  if (!order) throw notFound("Order not found");
  res.json(order);
});

// Hands back a Stripe Checkout URL for a pending order, reusing the open session if there is one
ordersRouter.post(
  "/:id/pay",
  requireRole("customer"),
  validate({ params: idParams }),
  async (req, res) => {
    const ownOrder = and(eq(orders.id, req.params.id), eq(orders.userId, req.user.id));
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        stripeSessionId: orders.stripeSessionId,
        createdAt: orders.createdAt
      })
      .from(orders)
      .where(ownOrder);
    if (!order) throw notFound("Order not found");
    if (order.status !== "pending") throw conflict("Only pending orders can be paid");

    if (order.stripeSessionId) return res.json({ url: await openCheckoutUrl(order.stripeSessionId) });

    // A fresh session would hold the books another 30 minutes; the order sweeper is about to
    // release them instead
    if (Date.now() - order.createdAt.getTime() > CHECKOUT_TTL_SECONDS * 1000) {
      throw conflict("The payment window for this order has closed");
    }

    // Charge the prices recorded on the order, not today's catalog prices
    const items = await db
      .select({ quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, title: books.title })
      .from(orderItems)
      .innerJoin(books, eq(orderItems.bookId, books.id))
      .where(eq(orderItems.orderId, order.id));

    const orderUrl = `${env.CLIENT_URL}/orders/${order.id}`;
    // Payment methods (card, UPI, ...) are chosen in the Stripe Dashboard, not here
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: env.CURRENCY,
          unit_amount: toCents(item.unitPrice),
          product_data: { name: item.title }
        }
      })),
      client_reference_id: String(order.id),
      metadata: { orderId: String(order.id) },
      customer_email: req.user.email,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
      success_url: `${orderUrl}?payment=success`,
      cancel_url: `${orderUrl}?payment=cancelled`
    });

    // Attach it only if the order is still pending and no other "Pay" click attached one first.
    // That's what stops two clicks opening two payable sessions for one order.
    const [attached] = await db
      .update(orders)
      .set({ stripeSessionId: session.id })
      .where(and(ownOrder, eq(orders.status, "pending"), isNull(orders.stripeSessionId)))
      .returning({ id: orders.id });
    if (attached) return res.json({ url: session.url });

    // Lost the race: close the session we made so nobody can pay it. If even that fails, a
    // payment on it matches no order, and onPaymentSucceeded refunds it.
    await stripe.checkout.sessions
      .expire(session.id)
      .catch((err) => logger.warn({ err, orderId: order.id, sessionId: session.id }, "Couldn't expire a duplicate checkout session"));
    const [current] = await db
      .select({ status: orders.status, stripeSessionId: orders.stripeSessionId })
      .from(orders)
      .where(ownOrder);
    if (current.status !== "pending" || !current.stripeSessionId) throw conflict("Only pending orders can be paid");
    res.json({ url: await openCheckoutUrl(current.stripeSessionId) });
  }
);

// A customer can cancel their own order while it's still pending
ordersRouter.post(
  "/:id/cancel",
  requireRole("customer"),
  validate({ params: idParams }),
  async (req, res) => {
    const [order] = await db
      .select({ id: orders.id, status: orders.status, stripeSessionId: orders.stripeSessionId })
      .from(orders)
      .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.user.id)));
    if (!order) throw notFound("Order not found");
    if (order.status !== "pending") throw conflict("Only pending orders can be cancelled");

    await cancelPending(order);
    res.json(await findOrder(req));
  }
);

// Store managers move orders through fulfilment
ordersRouter.patch(
  "/:id/status",
  requireRole("admin"),
  validate({ params: idParams, body: statusSchema }),
  async (req, res) => {
    const { status } = req.body;
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        stripeSessionId: orders.stripeSessionId,
        stripePaymentIntentId: orders.stripePaymentIntentId
      })
      .from(orders)
      .where(eq(orders.id, req.params.id));
    if (!order) throw notFound("Order not found");
    if (!NEXT_STATUSES[order.status].includes(status)) {
      throw conflict(`Can't change an order from ${order.status} to ${status}`);
    }

    if (status === "cancelled" && order.status === "pending") {
      await cancelPending(order);
      return res.json(await findOrder(req));
    }

    // Orders marked paid by hand have no payment intent, so there's nothing to refund.
    // Refunding first means a refusal from Stripe leaves the order paid; and if the update
    // below then fails, retrying reuses the same refund through the idempotency key.
    const refunding = status === "cancelled" && Boolean(order.stripePaymentIntentId);
    if (refunding) {
      await stripe.refunds.create(
        { payment_intent: order.stripePaymentIntentId },
        { idempotencyKey: `order-${order.id}-refund` }
      );
    }

    const change = await db.transaction(async (tx) => {
      // Only from the status checked above, since nothing was locked during the refund
      const [updated] = await tx
        .update(orders)
        .set({ status })
        .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
        .returning({ id: orders.id });
      if (!updated) {
        // Another admin moved it (paid -> shipped) while the refund went through
        if (refunding) logger.error({ orderId: order.id }, "Refunded an order whose status changed meanwhile; check it by hand");
        throw conflict("The order changed meanwhile; reload it and try again");
      }
      return status === "cancelled" ? restock(tx, order.id) : NO_STOCK_CHANGE;
    });
    await invalidateBooks(change);
    res.json(await findOrder(req));
  }
);
