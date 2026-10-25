import { siteConfig } from '@/config/site'

// Filter state lives in the URL so filtered views can be shared, bookmarked and navigated with Back.
// The URL uses the same parameter names as GET /books, so the params go to the API unchanged.

const FORMATS = siteConfig.filters.formats.map((f) => f.value)
const SORTS = siteConfig.browse.sortOptions.map((s) => s.value)
const RATINGS = siteConfig.filters.ratings

export const DEFAULT_SORT = 'title'

// price is null until the slider moves, meaning "the whole range"
export const EMPTY_FILTERS = {
  categories: [],
  publishers: [],
  formats: [],
  minRating: null,
  price: null,
  inStock: false,
}

const list = (params, key) => (params.get(key) ?? '').split(',').filter(Boolean)
const number = (params, key) => {
  const raw = params.get(key)
  return raw == null || raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw)
}

export function filtersFromParams(params) {
  const minRating = number(params, 'minRating')
  const minPrice = number(params, 'minPrice')
  const maxPrice = number(params, 'maxPrice')
  const sort = params.get('sort')

  return {
    filters: {
      categories: list(params, 'category'),
      publishers: list(params, 'publisher'),
      // Drop values the API would reject, so a hand-edited URL can't break the page
      formats: list(params, 'format').filter((f) => FORMATS.includes(f)),
      minRating: RATINGS.includes(minRating) ? minRating : null,
      price: minPrice != null || maxPrice != null ? [minPrice, maxPrice] : null,
      inStock: params.get('inStock') === 'true',
    },
    sort: SORTS.includes(sort) ? sort : DEFAULT_SORT,
  }
}

export function filtersToParams(filters, sort) {
  const params = {}
  if (filters.categories.length) params.category = filters.categories.join(',')
  if (filters.publishers.length) params.publisher = filters.publishers.join(',')
  if (filters.formats.length) params.format = filters.formats.join(',')
  if (filters.minRating != null) params.minRating = String(filters.minRating)
  if (filters.price?.[0] != null) params.minPrice = String(filters.price[0])
  if (filters.price?.[1] != null) params.maxPrice = String(filters.price[1])
  if (filters.inStock) params.inStock = 'true'
  if (sort && sort !== DEFAULT_SORT) params.sort = sort
  return params
}

// For the "Filters (3)" badge on small screens
export const activeFilterCount = (filters) =>
  filters.categories.length +
  filters.publishers.length +
  filters.formats.length +
  (filters.minRating != null ? 1 : 0) +
  (filters.price ? 1 : 0) +
  (filters.inStock ? 1 : 0)

// Facets list categories flat with parentId; show each parent followed by its children, indented
export function categoryOptions(categories = []) {
  const toOption = (c, depth) => ({ value: c.slug, label: c.name, count: c.count, depth })
  const childrenOf = (id) => categories.filter((c) => c.parentId === id)
  return categories
    .filter((c) => c.parentId == null)
    .flatMap((parent) => [toOption(parent, 0), ...childrenOf(parent.id).map((c) => toOption(c, 1))])
}

export const publisherOptions = (publishers = []) =>
  publishers.map((p) => ({ value: String(p.id), label: p.name, count: p.count }))

// Whole dollars so the slider ends land on round numbers
export const priceBounds = (price) =>
  price?.min != null ? [Math.floor(price.min), Math.ceil(price.max)] : [0, 100]
