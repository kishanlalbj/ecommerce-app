// Seeds the catalog (publishers, authors, categories, books) with real books.
// Safe to re-run: existing rows are matched by ISBN / name / slug and updated in place.
// Usage: npm run db:seed
import { eq } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import { authors, bookAuthors, bookCategories, books, categories, publishers } from "../db/schema.js";
import { CATEGORIES, BOOKS } from "./data/books.js";

const coverUrl = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

await db.transaction(async (tx) => {
  const categoryIds = {};
  for (const { slug, name, parent } of CATEGORIES) {
    const values = { slug, name, parentId: parent ? categoryIds[parent] : null };
    const [row] = await tx
      .insert(categories)
      .values(values)
      .onConflictDoUpdate({ target: categories.slug, set: values })
      .returning({ id: categories.id });
    categoryIds[slug] = row.id;
  }

  const publisherIds = {};
  const authorIds = {};

  for (const { authors: authorNames, publisher, categories: slugs, ...book } of BOOKS) {
    if (!publisherIds[publisher]) {
      const [row] = await tx
        .insert(publishers)
        .values({ name: publisher })
        .onConflictDoUpdate({ target: publishers.name, set: { name: publisher } })
        .returning({ id: publishers.id });
      publisherIds[publisher] = row.id;
    }

    const values = { ...book, publisherId: publisherIds[publisher], coverImageUrl: coverUrl(book.isbn) };
    const [{ id: bookId }] = await tx
      .insert(books)
      .values(values)
      .onConflictDoUpdate({ target: books.isbn, set: values })
      .returning({ id: books.id });

    for (const name of authorNames) {
      if (!authorIds[name]) {
        // authors.name isn't unique, so look up before inserting
        const [existing] = await tx.select({ id: authors.id }).from(authors).where(eq(authors.name, name));
        authorIds[name] = existing?.id ?? (await tx.insert(authors).values({ name }).returning({ id: authors.id }))[0].id;
      }
      await tx.insert(bookAuthors).values({ bookId, authorId: authorIds[name] }).onConflictDoNothing();
    }

    for (const slug of slugs) {
      await tx.insert(bookCategories).values({ bookId, categoryId: categoryIds[slug] }).onConflictDoNothing();
    }
  }
});

console.log(`Seeded ${BOOKS.length} books in ${CATEGORIES.length} categories`);
await pool.end();
