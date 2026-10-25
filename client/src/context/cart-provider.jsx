import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartContext } from '@/context/cart-context'
import { api } from '@/lib/api-client'
import { CART_KEY, cartStore } from '@/lib/cart-store'

const MAX_QUANTITY = 100

// stock is unknown until the book loads, so fall back to the overall cap
const clamp = (quantity, stock) =>
  Math.min(Math.max(Math.trunc(quantity), 1), stock ?? MAX_QUANTITY, MAX_QUANTITY)

// Why a line can't be bought as it stands; checkout is blocked until it's fixed
function problemFor(book, quantity) {
  if (book === null) return 'unavailable'
  if (!book) return null
  if (book.stock === 0) return 'soldOut'
  if (quantity > book.stock) return 'lowStock'
  return null
}

export function CartProvider({ children }) {
  // What's stored: [{ bookId, quantity }]. Book details are never stored, only fetched.
  const [lines, setLines] = useState(cartStore.get)
  // Current book data by id. No key = not loaded yet; null = no longer in the catalog.
  const [books, setBooks] = useState({})
  const [loadError, setLoadError] = useState(null)

  const linesRef = useRef(lines)
  useEffect(() => {
    linesRef.current = lines
    cartStore.set(lines)
  }, [lines])

  // Keep the cart in step when it changes in another tab
  useEffect(() => {
    function onStorage(event) {
      if (event.key === CART_KEY) setLines(cartStore.get())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const load = useCallback(async (ids) => {
    if (ids.length === 0) return
    try {
      // 100 is the API's page cap; a cart with more distinct books than that is not a real case
      const rows = await api.get('/books', {
        query: { ids: ids.join(','), limit: Math.min(ids.length, 100) },
      })
      setLoadError(null)
      setBooks((current) => {
        const next = { ...current }
        for (const id of ids) next[id] = null
        for (const book of rows) next[book.id] = book
        return next
      })
    } catch (error) {
      setLoadError(error)
    }
  }, [])

  // Fetch any book the cart refers to that hasn't been loaded yet
  const missing = lines
    .map((line) => line.bookId)
    .filter((id) => !(id in books))
    .sort((a, b) => a - b)
    .join(',')
  useEffect(() => {
    const fetchMissing = async () => {
      if (missing) await load(missing.split(',').map(Number))
    }
    fetchMissing()
  }, [missing, load])

  // Re-fetch every book in the cart; pages call this on open so prices and stock are current
  const refresh = useCallback(() => load(linesRef.current.map((line) => line.bookId)), [load])

  const add = useCallback((book, quantity = 1) => {
    // The caller just got this book from the API, so it's as fresh as a fetch would be
    setBooks((current) => ({ ...current, [book.id]: book }))
    setLines((current) => {
      const existing = current.find((line) => line.bookId === book.id)
      if (!existing) return [...current, { bookId: book.id, quantity: clamp(quantity, book.stock) }]
      return current.map((line) =>
        line.bookId === book.id ? { ...line, quantity: clamp(line.quantity + quantity, book.stock) } : line
      )
    })
  }, [])

  const setQuantity = useCallback(
    (bookId, quantity) => {
      setLines((current) =>
        current.map((line) =>
          line.bookId === bookId ? { ...line, quantity: clamp(quantity, books[bookId]?.stock) } : line
        )
      )
    },
    [books]
  )

  const remove = useCallback((bookId) => {
    setLines((current) => current.filter((line) => line.bookId !== bookId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(() => {
    // book: undefined while loading, null if it's gone from the catalog
    const items = lines.map((line) => {
      const book = books[line.bookId]
      return { ...line, book, problem: problemFor(book, line.quantity) }
    })
    const loaded = items.every((item) => item.book !== undefined)
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    // Work in cents so 0.1 + 0.2 style rounding never shows up in totals
    const subtotalCents = items.reduce(
      (sum, item) => (item.book ? sum + Math.round(Number(item.book.price) * 100) * item.quantity : sum),
      0
    )
    return {
      items,
      count,
      subtotal: subtotalCents / 100,
      loaded,
      loadError,
      canCheckout: loaded && items.length > 0 && items.every((item) => !item.problem),
      add,
      setQuantity,
      remove,
      clear,
      refresh,
    }
  }, [lines, books, loadError, add, setQuantity, remove, clear, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
