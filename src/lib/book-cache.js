import { invalidate } from "./cache.js";

// Cache keys and invalidation for catalog reads. TTLs are a backstop for changes made
// outside the API (seed script, Drizzle Studio, manual SQL); API writes invalidate right away.

const LIST_VERSION = "books";

export const bookCacheTtl = { list: 60, detail: 300, facets: 600 };

export const bookCacheKeys = {
  facets: "books:facets",
  detail: (id) => `book:${id}`,
  list: (version, query) => `books:list:v${version}:${query}`,
  listVersion: LIST_VERSION
};

// Stock or price changed: those books' detail entries and every cached list page
export const invalidateBooks = (ids) =>
  invalidate({ keys: ids.map(bookCacheKeys.detail), versions: [LIST_VERSION] });

// A book was added, edited or removed: also the facet counts and price range
export const invalidateCatalog = (ids = []) =>
  invalidate({
    keys: [...ids.map(bookCacheKeys.detail), bookCacheKeys.facets],
    versions: [LIST_VERSION]
  });
