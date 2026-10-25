import { z } from "zod";
import { bookFormat } from "../db/schema.js";

// "a,b,c" -> ["a", "b", "c"], each item validated by `item`
const csv = (item) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((v) => v.trim()).filter(Boolean) : []))
    .pipe(z.array(item));

export const listQuery = z.object({
  q: z.string().trim().optional(),
  // Fetch specific books, e.g. to show the cart with current prices
  ids: csv(z.coerce.number().int().positive()),
  // Values within one filter are OR'ed; different filters are AND'ed
  category: csv(z.string()), // slugs; a parent also matches its children
  publisher: csv(z.coerce.number().int().positive()),
  format: csv(z.enum(bookFormat.enumValues)),
  minRating: z.coerce.number().min(1).max(5).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z.stringbool().optional(),
  sort: z.enum(["title", "price_asc", "price_desc", "rating", "newest"]).default("title"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export const bookSchema = z.object({
  isbn: z.string().regex(/^\d{10}(\d{3})?$/, "ISBN must be 10 or 13 digits"),
  title: z.string().trim().min(1).max(255),
  subtitle: z.string().trim().max(255).nullish(),
  description: z.string().nullish(),
  publisherId: z.number().int().positive().nullish(),
  publishedDate: z.iso.date().nullish(),
  pages: z.number().int().positive().nullish(),
  language: z.string().max(10).optional(),
  format: z.enum(bookFormat.enumValues).optional(),
  price: z.coerce.number().nonnegative().transform(String),
  stock: z.number().int().nonnegative().optional(),
  coverImageUrl: z.url().max(500).nullish()
});
