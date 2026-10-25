import { asc, eq, ilike, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { books, bookFormat } from "../db/schema.js";
import { notFound } from "../lib/http-error.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParams, partialUpdate } from "../lib/validation.js";

const listQuery = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const bookSchema = z.object({
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

export const booksRouter = Router();

// Anyone can browse

booksRouter.get("/", validate({ query: listQuery }), async (req, res) => {
  const { q, limit, offset } = req.validatedQuery;
  const rows = await db
    .select()
    .from(books)
    .where(q ? or(ilike(books.title, `%${q}%`), ilike(books.isbn, `%${q}%`)) : undefined)
    .orderBy(asc(books.title))
    .limit(limit)
    .offset(offset);
  res.json(rows);
});

booksRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  const book = await db.query.books.findFirst({
    where: eq(books.id, req.params.id),
    with: {
      publisher: true,
      bookAuthors: { with: { author: true } },
      bookCategories: { with: { category: true } },
      reviews: true
    }
  });
  if (!book) throw notFound("Book not found");
  res.json(book);
});

// Only admins (store managers) can change the catalog

const adminOnly = [authenticate, requireRole("admin")];

booksRouter.post("/", ...adminOnly, validate({ body: bookSchema }), async (req, res) => {
  const [book] = await db.insert(books).values(req.body).returning();
  res.status(201).json(book);
});

booksRouter.patch(
  "/:id",
  ...adminOnly,
  validate({ params: idParams, body: partialUpdate(bookSchema) }),
  async (req, res) => {
    const [book] = await db
      .update(books)
      .set(req.body)
      .where(eq(books.id, req.params.id))
      .returning();
    if (!book) throw notFound("Book not found");
    res.json(book);
  }
);

booksRouter.delete("/:id", ...adminOnly, validate({ params: idParams }), async (req, res) => {
  // Fails with 409 if the book appears in any order (order history must stay intact)
  const [book] = await db.delete(books).where(eq(books.id, req.params.id)).returning({ id: books.id });
  if (!book) throw notFound("Book not found");
  res.status(204).end();
});
