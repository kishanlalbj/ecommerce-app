import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '@/components/ui/toast'
import { siteConfig } from '@/config/site'
import { useCart } from '@/context/cart-context'

const { addedToCart: copy, routes } = siteConfig

// Adds a book to the cart and confirms it with a toast that links to the cart
export function useAddToCart() {
  const { add } = useCart()
  const navigate = useNavigate()

  return useCallback(
    (book, quantity = 1) => {
      add(book, quantity)
      toast.add({
        type: 'success',
        title: copy.title,
        description: quantity > 1 ? `${book.title} × ${quantity}` : book.title,
        actionProps: { children: copy.viewCart, onClick: () => navigate(routes.cart) },
      })
    },
    [add, navigate]
  )
}
