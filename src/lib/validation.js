import { z } from "zod";

export const idParams = z.object({ id: z.coerce.number().int().positive() });

export const email = z.email().trim().toLowerCase().max(255);
export const password = z.string().min(8, "Password must be at least 8 characters").max(72);

// For PATCH bodies: every field optional, but at least one must be sent
export const partialUpdate = (schema) =>
  schema.partial().refine((data) => Object.keys(data).length > 0, "Nothing to update");
