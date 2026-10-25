import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { verifyToken } from "../lib/auth.js";
import { forbidden, unauthorized } from "../lib/http-error.js";

export const publicUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt
};

// Verifies the Bearer token and loads the user from the database, so a deleted
// or demoted account loses access immediately rather than when its token expires
export async function authenticate(req, res, next) {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) throw unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized("Invalid or expired token");
  }

  const [user] = await db
    .select(publicUserColumns)
    .from(users)
    .where(eq(users.id, Number(payload.sub)));
  if (!user) throw unauthorized("Account no longer exists");

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}
