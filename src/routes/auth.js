import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { DUMMY_HASH, hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { unauthorized } from "../lib/http-error.js";
import { authenticate, publicUserColumns } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.js";

export const authRouter = Router();

// Public sign-up always creates a customer; admins are created with `npm run create-admin`
authRouter.post("/register", validate({ body: registerSchema }), async (req, res) => {
  const { email, password, name } = req.body;
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password), role: "customer" })
    .returning(publicUserColumns);

  res.status(201).json({ user, token: signToken(user) });
});

authRouter.post("/login", validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body;
  const [found] = await db
    .select({ ...publicUserColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));

  const valid = await verifyPassword(password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !valid) throw unauthorized("Invalid email or password");

  const { passwordHash: _, ...user } = found;
  res.json({ user, token: signToken(user) });
});

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});
