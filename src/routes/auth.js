import { eq } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { DUMMY_HASH, hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { rateLimitStore } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { unauthorized } from "../lib/http-error.js";
import { authenticate, publicUserColumns } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.js";

export const authRouter = Router();

// Each login or sign-up costs a bcrypt hash, so these are what a password-guessing script
// or a bot would hammer. Counted per client IP, which is why TRUST_PROXY matters.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: rateLimitStore("rl:auth"),
  // A Redis error mid-outage lets the request through rather than failing it
  passOnStoreError: true,
  logger,
  message: { error: "Too many attempts, please try again later" }
});

// Public sign-up always creates a customer; admins are created with `npm run create-admin`
authRouter.post("/register", authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const { email, password, name } = req.body;
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash: await hashPassword(password), role: "customer" })
    .returning(publicUserColumns);

  res.status(201).json({ user, token: signToken(user) });
});

authRouter.post("/login", authLimiter, validate({ body: loginSchema }), async (req, res) => {
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
