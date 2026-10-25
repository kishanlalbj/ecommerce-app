// Native bcrypt hashes on libuv's thread pool. bcryptjs (pure JS) ran each ~250ms hash on
// the event loop, stalling every other request on the instance. Hashes are interchangeable.
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const SALT_ROUNDS = 12;

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Compared against when the email doesn't exist, so a failed login takes
// the same time whether or not the account exists
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

export function signToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);
