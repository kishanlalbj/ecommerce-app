import { z } from "zod";
import { email, password } from "./common.js";

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(255)
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1)
});
