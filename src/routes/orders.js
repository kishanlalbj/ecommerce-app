import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { addresses, books, orderItems, orders } from "../db/schema.js";
import { invalidateBooks } from "../lib/book-cache.js";
import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { CHECKOUT_TTL_SECONDS, cancelAndRestock, fromCents, restock, toCents } from "../lib/orders.js";
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

    const orderId = await db.transaction(async (tx) => {
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

      return order.id;
    });
    // Cached book pages and lists show stock, so every stock change clears them. This runs
    // after the commit: clearing inside the transaction would let a concurrent read cache
    // the old stock right back. Same for the cancel and status routes below.
    await invalidateBooks(bookIds);

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
    const url = await db.transaction(async (tx) => {
      // Lock the row so two clicks on "Pay" can't open two sessions for one order
      const [order] = await tx
        .select({
          id: orders.id,
          status: orders.status,
          stripeSessionId: orders.stripeSessionId,
          createdAt: orders.createdAt
        })
        .from(orders)
        .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.user.id)))
        .for("update");
      if (!order) throw notFound("Order not found");
      if (order.status !== "pending") throw conflict("Only pending orders can be paid");

      if (order.stripeSessionId) {
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (session.status === "open") return session.url;
        // The webhook will mark it paid or cancel it shortly
        throw conflict(
          session.status === "complete"
            ? "This order has already been paid"
            : "The payment window for this order has closed"
        );
      }

      // A fresh session would hold the books another 30 minutes; the order sweeper is about to
      // release them instead
      if (Date.now() - order.createdAt.getTime() > CHECKOUT_TTL_SECONDS * 1000) {
        throw conflict("The payment window for this order has closed");
      }

      // Charge the prices recorded on the order, not today's catalog prices
      const items = await tx
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

      await tx.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));
      return session.url;
    });
    res.json({ url });
  }
);

// A customer can cancel their own order while it's still pending
ordersRouter.post(
  "/:id/cancel",
  requireRole("customer"),
  validate({ params: idParams }),
  async (req, res) => {
    const restocked = await db.transaction(async (tx) => {
      // Lock the row so a simultaneous cancel or pay can't interleave with this one
      const [order] = await tx
        .select({ id: orders.id, status: orders.status, stripeSessionId: orders.stripeSessionId })
        .from(orders)
        .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.user.id)))
        .for("update");
      if (!order) throw notFound("Order not found");
      if (order.status !== "pending") throw conflict("Only pending orders can be cancelled");

      if (order.stripeSessionId) await closeCheckout(order.stripeSessionId);
      return cancelAndRestock(tx, order.id);
    });
    await invalidateBooks(restocked);
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
    const restocked = await db.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: orders.id,
          status: orders.status,
          stripeSessionId: orders.stripeSessionId,
          stripePaymentIntentId: orders.stripePaymentIntentId
        })
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .for("update");
      if (!order) throw notFound("Order not found");
      if (!NEXT_STATUSES[order.status].includes(status)) {
        throw conflict(`Can't change an order from ${order.status} to ${status}`);
      }

      if (status === "cancelled") {
        if (order.status === "pending" && order.stripeSessionId) {
          await closeCheckout(order.stripeSessionId);
        }
        // Orders marked paid by hand have no payment intent, so there's nothing to refund.
        // If Stripe refuses the refund, the transaction rolls back and the order stays paid.
        if (order.status === "paid" && order.stripePaymentIntentId) {
          await stripe.refunds.create(
            { payment_intent: order.stripePaymentIntentId },
            { idempotencyKey: `order-${order.id}-refund` }
          );
        }
      }

      await tx.update(orders).set({ status }).where(eq(orders.id, order.id));
      return status === "cancelled" ? restock(tx, order.id) : [];
    });
    if (restocked.length) await invalidateBooks(restocked);
    res.json(await findOrder(req));
  }
);
