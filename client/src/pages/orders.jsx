import { BookIcon, ChevronRightIcon, CircleAlertIcon, PackageIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AccountHeader } from '@/components/account/account-layout'
import { CancelOrderButton } from '@/components/account/cancel-order-button'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { formatDate, formatPrice } from '@/lib/format'
import { ordersApi } from '@/services/orders'

const { orders: copy, order: orderCopy, routes } = siteConfig

const MAX_COVERS = 4

function Covers({ items }) {
  const shown = items.slice(0, MAX_COVERS)
  const hidden = items.length - shown.length
  return (
    <div className="flex -space-x-3" aria-hidden="true">
      {shown.map(({ id, book }) => (
        <div
          key={id}
          className="flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-2 ring-card"
        >
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt="" className="size-full object-cover" />
          ) : (
            <BookIcon className="size-4 text-muted-foreground" />
          )}
        </div>
      ))}
      {hidden > 0 && (
        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground ring-2 ring-card">
          {copy.moreItems(hidden)}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, canCancel, onCancelled }) {
  const { id, status, createdAt, totalAmount, items } = order
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const titles = items.map((item) => item.book.title).join(', ')

  return (
    <Card className="flex-row flex-wrap items-center gap-4 px-4 sm:flex-nowrap">
      <Covers items={items} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{orderCopy.title(id)}</h2>
          <OrderStatusBadge status={status} />
        </div>
        <p className="truncate text-sm text-muted-foreground">{titles}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(createdAt)} · {copy.itemCount(count)} ·{' '}
          <span className="font-medium text-foreground tabular-nums">{formatPrice(totalAmount)}</span>
        </p>
      </div>
      <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
        {canCancel && status === 'pending' && <CancelOrderButton orderId={id} onCancelled={onCancelled} />}
        <Link
          to={routes.order(id)}
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}
          aria-label={`${copy.view} #${id}`}
        >
          {copy.view}
          <ChevronRightIcon data-icon="inline-end" />
        </Link>
      </div>
    </Card>
  )
}

function OrdersPage() {
  const { isAdmin } = useAuth()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => ordersApi.list().then(setOrders, setError), [])

  useEffect(() => {
    load()
  }, [load])

  function retry() {
    setError(null)
    load()
  }

  function onCancelled(updated) {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)))
  }

  return (
    <>
      <AccountHeader
        title={isAdmin ? copy.adminTitle : copy.title}
        description={isAdmin ? copy.adminDescription : copy.description}
      />

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

      {!orders && !error && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {orders?.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia className="text-muted-foreground">
              <PackageIcon className="size-12" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-xl">{copy.empty.title}</EmptyTitle>
            <EmptyDescription>{copy.empty.description}</EmptyDescription>
          </EmptyHeader>
          {!isAdmin && (
            <EmptyContent>
              <Link to={copy.empty.action.href} className={buttonVariants({ size: 'lg' })}>
                {copy.empty.action.label}
              </Link>
            </EmptyContent>
          )}
        </Empty>
      )}

      {orders?.length > 0 && (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              {/* Only customers can cancel, and only their own orders */}
              <OrderCard order={order} canCancel={!isAdmin} onCancelled={onCancelled} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default OrdersPage
