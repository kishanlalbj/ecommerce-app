import { z } from "zod";
import { email, partialUpdate, password } from "./common.js";

export const profileSchema = partialUpdate(
  z.object({
    name: z.string().trim().min(1).max(255),
    email
  })
);

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password
});

export const addressSchema = z.object({
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).nullish(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).nullish(),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2, "Use a 2-letter country code").toUpperCase(),
  isDefault: z.boolean().optional()
});
