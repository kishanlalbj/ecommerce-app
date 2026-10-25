import { ArrowLeftIcon, CircleAlertIcon, CircleCheckIcon, PackageSearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { CancelOrderButton } from '@/components/account/cancel-order-button'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { OrderLine } from '@/components/store/order-line'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { formatAddress, formatDate, formatPrice } from '@/lib/format'
import { ordersApi } from '@/services/orders'

const { order: copy, routes } = siteConfig

function OrderSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  )
}

function OrderPage() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const location = useLocation()
  // Checkout hands over the order it just placed, so there's nothing to fetch on arrival
  const handedOver = location.state?.order
  const justPlaced = Boolean(location.state?.justPlaced)

  const [order, setOrder] = useState(String(handedOver?.id) === id ? handedOver : null)
  const [error, setError] = useState(null)

  const load = useCallback(() => ordersApi.get(id).then(setOrder, setError), [id])

  useEffect(() => {
    if (String(order?.id) !== id) load()
  }, [id, order, load])

  function retry() {
    setError(null)
    load()
  }

  if (error?.status === 404 || error?.status === 400) {
    return (
      <section className="mx-auto flex min-h-128 max-w-7xl px-4 py-24">
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="text-muted-foreground">
              <PackageSearchIcon className="size-12" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-xl">
              <h1>{copy.notFound.title}</h1>
            </EmptyTitle>
            <EmptyDescription>{copy.notFound.description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to={routes.home} className={buttonVariants({ size: 'lg' })}>
              {copy.keepShopping}
            </Link>
          </EmptyContent>
        </Empty>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            {copy.loadError}
            <Button variant="outline" size="sm" onClick={retry}>
              {copy.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!order && !error && <OrderSkeleton />}

      {order && (
        <div className="flex flex-col gap-6">
          {!justPlaced && (
            <Link
              to={routes.orders}
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-mb-2 -ml-2.5 self-start' })}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {copy.backToOrders}
            </Link>
          )}
          <header className="flex flex-col gap-3">
            {justPlaced && (
              <CircleCheckIcon className="size-10 text-primary" aria-hidden="true" />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {justPlaced ? copy.placedTitle : copy.title(order.id)}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            {justPlaced && <p className="text-muted-foreground">{copy.placedDescription}</p>}
            <p className="text-sm text-muted-foreground">
              {justPlaced && `${copy.title(order.id)} · `}
              {copy.placedOn(formatDate(order.createdAt))}
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{copy.itemsTitle}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <ul className="-mt-4 divide-y">
                {order.items.map((item) => (
                  <OrderLine
                    key={item.id}
                    bookId={item.bookId}
                    title={item.book.title}
                    coverImageUrl={item.book.coverImageUrl}
                    quantity={item.quantity}
                    unitPrice={item.unitPrice}
                  />
                ))}
              </ul>
              <div className="flex justify-between border-t pt-4 text-base font-semibold">
                <span>{copy.total}</span>
                <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{copy.shippingTitle}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {order.shippingAddress ? formatAddress(order.shippingAddress) : copy.addressRemoved}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Link to={routes.home} className={buttonVariants({ size: 'lg' })}>
              {copy.keepShopping}
            </Link>
            {!isAdmin && order.status === 'pending' && (
              <CancelOrderButton orderId={order.id} onCancelled={setOrder} size="lg" />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default OrderPage
