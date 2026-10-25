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

// An order changed stock (see NO_STOCK_CHANGE in orders.js). Detail pages show exact stock,
// so those are always cleared. List pages are cleared only when a book sold out or came
// back, since that changes which books they show and the sold-out badge. Clearing them on
// every order would empty the list cache several times a minute under real traffic; their
// "only N left" counts can instead lag by up to the list TTL. Checkout reads live stock.
export const invalidateBooks = ({ bookIds, availabilityChanged }) =>
  invalidate({
    keys: bookIds.map(bookCacheKeys.detail),
    versions: availabilityChanged ? [LIST_VERSION] : []
  });

// A book was added, edited or removed: also the facet counts and price range
export const invalidateCatalog = (ids = []) =>
  invalidate({
    keys: [...ids.map(bookCacheKeys.detail), bookCacheKeys.facets],
    versions: [LIST_VERSION]
  });
