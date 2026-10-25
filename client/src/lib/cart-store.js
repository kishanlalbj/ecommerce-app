export const CART_KEY = 'cart.items'

// The cart lives in the browser so guests can shop before they have an account.
// Only { bookId, quantity } is stored; titles, prices and stock are always fetched fresh.
// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
export const cartStore = {
  get() {
    try {
      const items = JSON.parse(localStorage.getItem(CART_KEY))
      if (!Array.isArray(items)) return []
      // Older carts stored a copy of each book; keep just the reference
      return items
        .filter((item) => Number.isInteger(item?.bookId) && item.quantity > 0)
        .map(({ bookId, quantity }) => ({ bookId, quantity }))
    } catch {
      return []
    }
  },
  set(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      // Not persisted; the cart lasts until the page is reloaded
    }
  },
}
