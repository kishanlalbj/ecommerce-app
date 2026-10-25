// Creates an admin, or promotes an existing user to admin and resets their password.
// Usage: npm run create-admin -- <email> <password> [name]
import { db, pool } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/auth.js";
import { email as emailSchema, password as passwordSchema } from "../lib/validation.js";

const [rawEmail, rawPassword, name = "Store Admin"] = process.argv.slice(2);

const email = emailSchema.safeParse(rawEmail);
const password = passwordSchema.safeParse(rawPassword);
if (!email.success || !password.success) {
  console.error("Usage: npm run create-admin -- <email> <password (8+ chars)> [name]");
  process.exit(1);
}

const passwordHash = await hashPassword(password.data);
const [admin] = await db
  .insert(users)
  .values({ email: email.data, passwordHash, name, role: "admin" })
  .onConflictDoUpdate({ target: users.email, set: { passwordHash, role: "admin" } })
  .returning({ id: users.id, email: users.email, role: users.role });

console.log(`Admin ready: ${admin.email} (id ${admin.id})`);
await pool.end();
