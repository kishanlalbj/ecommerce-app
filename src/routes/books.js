import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  max,
  min,
  or,
  sql
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router } from "express";
import { db } from "../db/index.js";
import {
  bookCategories,
  bookFormat,
  books,
  categories,
  publishers,
  reviews
} from "../db/schema.js";
import { bookCacheKeys, bookCacheTtl, invalidateCatalog } from "../lib/book-cache.js";
import { cached, getVersion } from "../lib/cache.js";
import { notFound } from "../lib/http-error.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParams, partialUpdate } from "../schemas/common.js";
import { bookSchema, listQuery } from "../schemas/books.js";

export const booksRouter = Router();

// Anyone can browse

// Average rating and review count per book
const ratings = db.$with("ratings").as(
  db
    .select({
      bookId: reviews.bookId,
      avgRating: sql`round(avg(${reviews.rating}), 1)`.mapWith(Number).as("avg_rating"),
      reviewCount: count().as("review_count")
    })
    .from(reviews)
    .groupBy(reviews.bookId)
);

const sortOrders = {
  title: [asc(books.title)],
  price_asc: [asc(books.price)],
  price_desc: [desc(books.price)],
  rating: [sql`${ratings.avgRating} desc nulls last`, sql`${ratings.reviewCount} desc nulls last`],
  newest: [sql`${books.publishedDate} desc nulls last`]
};

// Ids of the categories with these slugs, plus their direct children
const categoryIdsFor = (slugs) => {
  const picked = db.select({ id: categories.id }).from(categories).where(inArray(categories.slug, slugs));
  return db
    .select({ id: categories.id })
    .from(categories)
    .where(or(inArray(categories.id, picked), inArray(categories.parentId, picked)));
};

function listBooks({ q, ids, category, publisher, format, minRating, minPrice, maxPrice, inStock, sort, limit, offset }) {
  const where = [];
  if (ids.length) where.push(inArray(books.id, ids));
  if (q) where.push(or(ilike(books.title, `%${q}%`), ilike(books.isbn, `%${q}%`)));
  if (publisher.length) where.push(inArray(books.publisherId, publisher));
  if (format.length) where.push(inArray(books.format, format));
  if (minPrice != null) where.push(gte(books.price, String(minPrice)));
  if (maxPrice != null) where.push(lte(books.price, String(maxPrice)));
  if (inStock) where.push(gt(books.stock, 0));
  if (minRating != null) where.push(gte(ratings.avgRating, minRating));
  if (category.length) {
    const bookIds = db
      .select({ id: bookCategories.bookId })
      .from(bookCategories)
      .where(inArray(bookCategories.categoryId, categoryIdsFor(category)));
    where.push(inArray(books.id, bookIds));
  }

  return db
    .with(ratings)
    .select({
      ...getTableColumns(books),
      avgRating: ratings.avgRating,
      reviewCount: sql`coalesce(${ratings.reviewCount}, 0)`.mapWith(Number)
    })
    .from(books)
    .leftJoin(ratings, eq(ratings.bookId, books.id))
    .where(and(...where))
    // id last so pages stay stable when sort values tie
    .orderBy(...sortOrders[sort], asc(books.id))
    .limit(limit)
    .offset(offset);
}

// Same filters in any order produce the same key
const stableKey = (query) =>
  JSON.stringify(Object.fromEntries(Object.entries(query).sort(([a], [b]) => a.localeCompare(b))));

// X-Cache shows in the browser's network tab whether Redis answered (HIT), Postgres answered
// and the result was cached (MISS), or the cache was skipped (BYPASS)
const sendCached = (res, { value, status }) => res.set("X-Cache", status).json(value);

booksRouter.get("/", validate({ query: listQuery }), async (req, res) => {
  const query = req.validatedQuery;
  // ?ids= is how the cart and checkout get current prices and stock, so it always reads Postgres
  const version = query.ids.length ? null : await getVersion(bookCacheKeys.listVersion);
  if (version == null) return sendCached(res, { value: await listBooks(query), status: "BYPASS" });

  sendCached(
    res,
    await cached(bookCacheKeys.list(version, stableKey(query)), bookCacheTtl.list, () => listBooks(query))
  );
});

// What the filter sidebar can offer, with book counts. Registered before /:id so "facets" isn't read as an id.
booksRouter.get("/facets", async (req, res) => {
  sendCached(res, await cached(bookCacheKeys.facets, bookCacheTtl.facets, loadFacets));
});

async function loadFacets() {
  const child = alias(categories, "child");
  const [categoryRows, publisherRows, [priceRange]] = await Promise.all([
    // A parent's count includes books filed only under its children
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        parentId: categories.parentId,
        count: sql`count(distinct ${bookCategories.bookId})`.mapWith(Number)
      })
      .from(categories)
      .leftJoin(
        bookCategories,
        or(
          eq(bookCategories.categoryId, categories.id),
          inArray(
            bookCategories.categoryId,
            db.select({ id: child.id }).from(child).where(eq(child.parentId, categories.id))
          )
        )
      )
      .groupBy(categories.id)
      .orderBy(asc(categories.name)),
    db
      .select({ id: publishers.id, name: publishers.name, count: count(books.id) })
      .from(publishers)
      .innerJoin(books, eq(books.publisherId, publishers.id))
      .groupBy(publishers.id)
      .orderBy(asc(publishers.name)),
    db
      .select({
        min: min(books.price).mapWith(Number),
        max: max(books.price).mapWith(Number)
      })
      .from(books)
  ]);

  return {
    categories: categoryRows,
    publishers: publisherRows,
    formats: bookFormat.enumValues,
    price: priceRange
  };
}

booksRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  const { id } = req.params;
  // Missing books are cached as null too; creating a book clears its id's key
  const result = await cached(bookCacheKeys.detail(id), bookCacheTtl.detail, async () => {
    const found = await db.query.books.findFirst({
      where: eq(books.id, id),
      with: {
        publisher: true,
        bookAuthors: { with: { author: true } },
        bookCategories: { with: { category: true } },
        reviews: true
      }
    });
    return found ?? null;
  });
  res.set("X-Cache", result.status);
  if (!result.value) throw notFound("Book not found");
  res.json(result.value);
});

// Only admins (store managers) can change the catalog

const adminOnly = [authenticate, requireRole("admin")];

booksRouter.post("/", ...adminOnly, validate({ body: bookSchema }), async (req, res) => {
  const [book] = await db.insert(books).values(req.body).returning();
  await invalidateCatalog([book.id]);
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
    await invalidateCatalog([book.id]);
    res.json(book);
  }
);

booksRouter.delete("/:id", ...adminOnly, validate({ params: idParams }), async (req, res) => {
  // Fails with 409 if the book appears in any order (order history must stay intact)
  const [book] = await db.delete(books).where(eq(books.id, req.params.id)).returning({ id: books.id });
  if (!book) throw notFound("Book not found");
  await invalidateCatalog([book.id]);
  res.status(204).end();
});
