import { ArrowLeftIcon, CircleAlertIcon, CircleCheckIcon, ClockIcon, PackageSearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { CancelOrderButton } from '@/components/account/cancel-order-button'
import { OrderStatusBadge } from '@/components/account/order-status-badge'
import { OrderLine } from '@/components/store/order-line'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { toFormErrors } from '@/lib/form-errors'
import { formatAddress, formatDate, formatPrice } from '@/lib/format'
import { ordersApi } from '@/services/orders'

const { order: copy, routes } = siteConfig

// After Stripe sends the customer back, the webhook that marks the order paid can lag a little
const POLL_MS = 2000
const MAX_POLLS = 10

// Sends the customer to Stripe Checkout for a pending order
function PayButton({ orderId, onFailed }) {
  const [redirecting, setRedirecting] = useState(false)

  async function pay() {
    setRedirecting(true)
    try {
      const { url } = await ordersApi.pay(orderId)
      window.location.assign(url)
    } catch (error) {
      // e.g. 409 when the payment window closed and the order is being cancelled
      toast.add({ type: 'error', title: toFormErrors(error).formError ?? copy.payment.error })
      setRedirecting(false)
      onFailed()
    }
  }

  return (
    <Button size="lg" disabled={redirecting} onClick={pay}>
      {redirecting && <Spinner />}
      {redirecting ? copy.redirecting : copy.payNow}
    </Button>
  )
}

// What the customer needs to know about paying for this order, if anything
function PaymentNotice({ order, result, paymentError, slow }) {
  if (order.status !== 'pending') return null

  let message = copy.payment.unpaid
  let icon = <ClockIcon />
  if (paymentError) message = copy.payment.error
  else if (result === 'success') {
    message = slow ? copy.payment.confirmingSlow : copy.payment.confirming
    icon = <Spinner />
  } else if (result === 'cancelled') message = copy.payment.cancelled

  return (
    <Alert variant={paymentError ? 'destructive' : 'default'} role="status">
      {paymentError ? <CircleAlertIcon /> : icon}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

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
  // Checkout hands over the order when it couldn't start the payment
  const handedOver = location.state?.order
  const paymentError = Boolean(location.state?.paymentError)
  // Stripe sends the customer back with ?payment=success or ?payment=cancelled
  const [searchParams] = useSearchParams()
  const paymentResult = searchParams.get('payment')

  const [order, setOrder] = useState(String(handedOver?.id) === id ? handedOver : null)
  const [error, setError] = useState(null)
  const [slow, setSlow] = useState(false)

  const load = useCallback(() => ordersApi.get(id).then(setOrder, setError), [id])

  useEffect(() => {
    if (String(order?.id) !== id) load()
  }, [id, order, load])

  // Stops by itself once the webhook lands and the order is no longer pending
  const confirming = paymentResult === 'success' && order?.status === 'pending'
  useEffect(() => {
    if (!confirming) return
    let polls = 0
    const timer = setInterval(() => {
      if (++polls > MAX_POLLS) {
        clearInterval(timer)
        setSlow(true)
        return
      }
      ordersApi.get(id).then(setOrder, () => {})
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [confirming, id])

  const justPaid = paymentResult === 'success' && order?.status === 'paid'

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
          {!justPaid && (
            <Link
              to={routes.orders}
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-mb-2 -ml-2.5 self-start' })}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {copy.backToOrders}
            </Link>
          )}
          <header className="flex flex-col gap-3">
            {justPaid && (
              <CircleCheckIcon className="size-10 text-primary" aria-hidden="true" />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {justPaid ? copy.placedTitle : copy.title(order.id)}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            {justPaid && <p className="text-muted-foreground">{copy.placedDescription}</p>}
            <p className="text-sm text-muted-foreground">
              {justPaid && `${copy.title(order.id)} · `}
              {copy.placedOn(formatDate(order.createdAt))}
            </p>
          </header>

          {!isAdmin && (
            <PaymentNotice order={order} result={paymentResult} paymentError={paymentError} slow={slow} />
          )}

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
            {/* While the webhook is confirming, paying again would just reopen the finished session */}
            {!isAdmin && order.status === 'pending' && !confirming && <PayButton orderId={order.id} onFailed={load} />}
            <Link
              to={routes.home}
              className={buttonVariants({ size: 'lg', variant: !isAdmin && order.status === 'pending' ? 'outline' : 'default' })}
            >
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
