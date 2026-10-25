import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { addresses, users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { idParams, partialUpdate } from "../schemas/common.js";
import { addressSchema, passwordSchema, profileSchema } from "../schemas/me.js";
import { authenticate, publicUserColumns } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

// Everything here acts on the logged-in user's own data only
export const meRouter = Router();
meRouter.use(authenticate);

meRouter.get("/", (req, res) => {
  res.json({ user: req.user });
});

meRouter.patch("/", validate({ body: profileSchema }), async (req, res) => {
  const [user] = await db
    .update(users)
    .set(req.body)
    .where(eq(users.id, req.user.id))
    .returning(publicUserColumns);
  res.json({ user });
});

meRouter.put("/password", validate({ body: passwordSchema }), async (req, res) => {
  const [{ passwordHash }] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, req.user.id));

  if (!(await verifyPassword(req.body.currentPassword, passwordHash))) {
    throw badRequest("Current password is incorrect");
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(req.body.newPassword) })
    .where(eq(users.id, req.user.id));
  res.status(204).end();
});

// Addresses

const ownAddress = (req) =>
  and(eq(addresses.id, req.params.id), eq(addresses.userId, req.user.id));

// Only one default address per user: clear the others first, in the same transaction
async function saveAddress(tx, userId, isDefault, write) {
  if (isDefault) {
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }
  return write(tx);
}

meRouter.get("/addresses", async (req, res) => {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, req.user.id))
    .orderBy(asc(addresses.id));
  res.json(rows);
});

meRouter.post("/addresses", validate({ body: addressSchema }), async (req, res) => {
  const address = await db.transaction((tx) =>
    saveAddress(tx, req.user.id, req.body.isDefault, async () => {
      const [row] = await tx
        .insert(addresses)
        .values({ ...req.body, userId: req.user.id })
        .returning();
      return row;
    })
  );
  res.status(201).json(address);
});

meRouter.patch(
  "/addresses/:id",
  validate({ params: idParams, body: partialUpdate(addressSchema) }),
  async (req, res) => {
    const address = await db.transaction((tx) =>
      saveAddress(tx, req.user.id, req.body.isDefault, async () => {
        const [row] = await tx.update(addresses).set(req.body).where(ownAddress(req)).returning();
        // Throwing inside the transaction also undoes the default reset above
        if (!row) throw notFound("Address not found");
        return row;
      })
    );
    res.json(address);
  }
);

meRouter.delete("/addresses/:id", validate({ params: idParams }), async (req, res) => {
  const [address] = await db.delete(addresses).where(ownAddress(req)).returning({ id: addresses.id });
  if (!address) throw notFound("Address not found");
  res.status(204).end();
});
