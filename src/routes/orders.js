import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { addresses, books, orderItems, orderStatus, orders } from "../db/schema.js";
import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { idParams } from "../lib/validation.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const createOrderSchema = z.object({
  shippingAddressId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        bookId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100)
      })
    )
    .min(1, "Order must contain at least one item")
});

const statusSchema = z.object({ status: z.enum(orderStatus.enumValues) });

// Which status changes a store manager may make
const NEXT_STATUSES = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: []
};

const toCents = (price) => Math.round(Number(price) * 100);
const fromCents = (cents) => (cents / 100).toFixed(2);

const isAdmin = (req) => req.user.role === "admin";

async function findOrder(req, tx = db) {
  return tx.query.orders.findFirst({
    // Customers can only ever see their own orders
    where: isAdmin(req)
      ? eq(orders.id, req.params.id)
      : and(eq(orders.id, req.params.id), eq(orders.userId, req.user.id)),
    with: {
      items: { with: { book: { columns: { id: true, title: true, isbn: true } } } },
      shippingAddress: true
    }
  });
}

// Puts the ordered quantities back on the shelf
async function restock(tx, orderId) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    await tx
      .update(books)
      .set({ stock: sql`${books.stock} + ${item.quantity}` })
      .where(eq(books.id, item.bookId));
  }
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

    req.params.id = orderId;
    res.status(201).json(await findOrder(req));
  }
);

// Customers see their own orders; admins see every order
ordersRouter.get("/", async (req, res) => {
  const rows = await db.query.orders.findMany({
    where: isAdmin(req) ? undefined : eq(orders.userId, req.user.id),
    orderBy: desc(orders.createdAt),
    with: { items: true }
  });
  res.json(rows);
});

ordersRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  const order = await findOrder(req);
  if (!order) throw notFound("Order not found");
  res.json(order);
});

// A customer can cancel their own order while it's still pending
ordersRouter.post(
  "/:id/cancel",
  requireRole("customer"),
  validate({ params: idParams }),
  async (req, res) => {
    await db.transaction(async (tx) => {
      // Conditional update, so two simultaneous cancels can't both restock
      const [cancelled] = await tx
        .update(orders)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(orders.id, req.params.id),
            eq(orders.userId, req.user.id),
            eq(orders.status, "pending")
          )
        )
        .returning({ id: orders.id });

      if (!cancelled) {
        if (!(await findOrder(req, tx))) throw notFound("Order not found");
        throw conflict("Only pending orders can be cancelled");
      }
      await restock(tx, cancelled.id);
    });
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
    await db.transaction(async (tx) => {
      const [order] = await tx
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.id, req.params.id))
        .for("update");
      if (!order) throw notFound("Order not found");
      if (!NEXT_STATUSES[order.status].includes(status)) {
        throw conflict(`Can't change an order from ${order.status} to ${status}`);
      }

      await tx.update(orders).set({ status }).where(eq(orders.id, order.id));
      if (status === "cancelled") await restock(tx, order.id);
    });
    res.json(await findOrder(req));
  }
);
