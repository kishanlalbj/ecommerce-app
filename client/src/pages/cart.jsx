import { useEffect } from 'react'
import { CircleAlertIcon, ShoppingCartIcon } from 'lucide-react'
import { Link } from 'react-router'
import { CartItem } from '@/components/store/cart-item'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { useCart } from '@/context/cart-context'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'

const { cart: copy, routes } = siteConfig

function CartPage() {
  const { items, subtotal, loaded, loadError, canCheckout, setQuantity, remove, refresh } = useCart()
  const { user } = useAuth()

  // Prices and stock may have changed since the books were added
  useEffect(() => {
    refresh()
  }, [refresh])

  const hasProblems = items.some((item) => item.problem)

  if (items.length === 0) {
    return (
      <section className="mx-auto flex min-h-128 max-w-7xl px-4 py-24">
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="text-muted-foreground">
              <ShoppingCartIcon className="size-12" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-xl">
              <h1>{copy.empty.title}</h1>
            </EmptyTitle>
            <EmptyDescription>{copy.empty.description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to={copy.empty.action.href} className={buttonVariants({ size: 'lg' })}>
              {copy.empty.action.label}
            </Link>
          </EmptyContent>
        </Empty>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 font-heading text-3xl font-semibold tracking-tight">{copy.title}</h1>

      {loadError && (
        <Alert variant="destructive" role="alert" className="mb-6">
          <CircleAlertIcon />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {copy.loadError}
            <Button variant="outline" size="sm" onClick={refresh}>
              {copy.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ul className="divide-y border-y">
          {items.map((item) => (
            <CartItem
              key={item.bookId}
              item={item}
              onIncrease={() => setQuantity(item.bookId, item.quantity + 1)}
              onDecrease={() => setQuantity(item.bookId, item.quantity - 1)}
              onRemove={() => remove(item.bookId)}
            />
          ))}
        </ul>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>{copy.subtotal}</span>
              {loaded ? (
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              ) : (
                <Skeleton className="h-5 w-20" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{copy.note}</p>
            {!user && <p className="mt-2">{copy.guestHint}</p>}
            {hasProblems && <p className="mt-2 text-destructive">{copy.fixProblems}</p>}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            {/* Guests are sent to log in by RequireAuth, then come back to checkout */}
            {canCheckout ? (
              <Link to={routes.checkout} className={buttonVariants({ size: 'lg', className: 'w-full' })}>
                {copy.checkout}
              </Link>
            ) : (
              <Button size="lg" className="w-full" disabled>
                {copy.checkout}
              </Button>
            )}
            <Link to={routes.home} className={buttonVariants({ variant: 'ghost', className: 'w-full' })}>
              {copy.continueShopping}
            </Link>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

export default CartPage
