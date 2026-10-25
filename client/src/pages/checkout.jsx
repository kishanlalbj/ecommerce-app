import { ArrowLeftIcon, CheckIcon, CircleAlertIcon, LockIcon, PlusIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AddressForm } from '@/components/account/address-form'
import { OrderLine } from '@/components/store/order-line'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'
import { useCart } from '@/context/cart-context'
import { toFormErrors } from '@/lib/form-errors'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meApi } from '@/services/me'
import { ordersApi } from '@/services/orders'

const { checkout: copy, address: addressCopy, routes } = siteConfig

const problemText = (problem, book) =>
  problem === 'lowStock' ? siteConfig.cart.problems.lowStock(book.stock) : siteConfig.cart.problems[problem]

// A numbered checkout section; the number turns into a tick once the step is complete
function Step({ number, done, title, description, action, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full border text-sm tabular-nums',
              done && 'border-primary bg-primary text-primary-foreground'
            )}
          >
            {done ? <CheckIcon className="size-4" aria-hidden="true" /> : <span aria-hidden="true">{number}</span>}
          </span>
          <h2>
            <span className="sr-only">{`Step ${number}: `}</span>
            {title}
          </h2>
        </CardTitle>
        {description && <CardDescription className="pl-10">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function AddressOption({ address }) {
  const { id, line1, line2, city, state, postalCode, country, isDefault } = address
  return (
    <Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors hover:bg-muted/50 has-data-checked:border-primary has-data-checked:bg-primary/5">
      <RadioGroupItem value={String(id)} className="mt-0.5" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm leading-snug">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{line1}</span>
          {isDefault && <Badge variant="secondary">{addressCopy.defaultBadge}</Badge>}
        </span>
        {line2 && <span className="text-muted-foreground">{line2}</span>}
        <span className="text-muted-foreground">
          {[city, state, postalCode].filter(Boolean).join(', ')}
        </span>
        <span className="text-muted-foreground">{country}</span>
      </span>
    </Label>
  )
}

function CheckoutPage() {
  const { isAdmin } = useAuth()
  const { items, count, subtotal, loaded, canCheckout, clear, refresh } = useCart()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState(null)
  const [addressId, setAddressId] = useState(null)
  const [addingAddress, setAddingAddress] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)

  useEffect(() => {
    meApi
      .listAddresses()
      .then((rows) => {
        setAddresses(rows)
        const preferred = rows.find((a) => a.isDefault) ?? rows[0]
        if (preferred) setAddressId(String(preferred.id))
        else setAddingAddress(true)
      })
      .catch((error) => setLoadError(toFormErrors(error).formError))
  }, [])

  // Show the prices the order will actually be charged at
  useEffect(() => {
    refresh()
  }, [refresh])

  // Placing the order empties the cart; don't bounce to /cart on the way to Stripe
  if (placed) {
    return (
      <section
        className="mx-auto flex min-h-128 max-w-7xl items-center justify-center gap-3 px-4 py-24 text-muted-foreground"
        aria-live="polite"
      >
        <Spinner />
        {copy.redirecting}
      </section>
    )
  }
  if (items.length === 0) return <Navigate to={routes.cart} replace />

  function onAddressSaved(address) {
    setAddresses((current) => [
      ...(address.isDefault ? current.map((a) => ({ ...a, isDefault: false })) : current),
      address,
    ])
    setAddressId(String(address.id))
    setAddingAddress(false)
  }

  async function placeOrder() {
    setOrderError(null)
    setPlacing(true)
    let order
    try {
      order = await ordersApi.place(
        items.map(({ bookId, quantity }) => ({ bookId, quantity })),
        Number(addressId)
      )
    } catch (error) {
      // e.g. 409 "Only 2 left of …" when stock ran out after it was added to the cart
      setOrderError(toFormErrors(error).formError ?? siteConfig.auth.errors.generic)
      setPlacing(false)
      refresh()
      return
    }

    // The order holds the books now, so the cart's job is done whatever happens with payment
    setPlaced(true)
    clear()
    try {
      const { url } = await ordersApi.pay(order.id)
      window.location.assign(url)
    } catch {
      // The order page has a "Pay now" button to try again
      navigate(routes.order(order.id), { replace: true, state: { order, paymentError: true } })
    }
  }

  const addressDone = Boolean(addressId) && !addingAddress
  const canPlace = !isAdmin && canCheckout && addressDone && !placing
  const hasProblems = items.some((item) => item.problem)

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <Link
        to={routes.cart}
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2.5 mb-4' })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        {copy.backToCart}
      </Link>
      <h1 className="mb-6 font-heading text-3xl font-semibold tracking-tight">{copy.title}</h1>

      {isAdmin && (
        <Alert className="mb-6" role="alert">
          <CircleAlertIcon />
          <AlertDescription>{copy.adminBlocked}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Step number={1} done={addressDone} title={copy.addressTitle} description={copy.addressDescription}>
            <div className="flex flex-col gap-4">
              {loadError && (
                <Alert variant="destructive" role="alert">
                  <CircleAlertIcon />
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
              )}

              {!addresses && !loadError && (
                <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label={copy.loadingAddresses}>
                  <Skeleton className="h-28 rounded-lg" />
                  <Skeleton className="h-28 rounded-lg" />
                </div>
              )}

              {addresses?.length > 0 && (
                <RadioGroup
                  value={addressId}
                  onValueChange={setAddressId}
                  aria-label={copy.addressTitle}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {addresses.map((address) => (
                    <AddressOption key={address.id} address={address} />
                  ))}
                </RadioGroup>
              )}

              {addresses &&
                (addingAddress ? (
                  <AddressForm
                    isFirst={addresses.length === 0}
                    onSaved={onAddressSaved}
                    onCancel={addresses.length > 0 ? () => setAddingAddress(false) : undefined}
                  />
                ) : (
                  <Button variant="outline" className="self-start" onClick={() => setAddingAddress(true)}>
                    <PlusIcon data-icon="inline-start" />
                    {addressCopy.add}
                  </Button>
                ))}
            </div>
          </Step>

          <Step
            number={2}
            done={addressDone && canCheckout}
            title={copy.itemsTitle}
            description={copy.itemsDescription(count)}
            action={
              <Link to={routes.cart} className={buttonVariants({ variant: 'link', size: 'sm' })}>
                {copy.editCart}
              </Link>
            }
          >
            <ul className="-my-4 divide-y">
              {items.map(({ bookId, quantity, book, problem }) =>
                book === undefined ? (
                  <li key={bookId} className="flex gap-4 py-4" aria-hidden="true">
                    <Skeleton className="h-20 w-14 shrink-0 rounded-md" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </li>
                ) : book === null ? (
                  <li key={bookId} className="py-4 text-sm text-destructive">
                    {siteConfig.cart.unavailableTitle}: {siteConfig.cart.problems.unavailable}
                  </li>
                ) : (
                  <OrderLine
                    key={bookId}
                    bookId={bookId}
                    title={book.title}
                    coverImageUrl={book.coverImageUrl}
                    quantity={quantity}
                    unitPrice={book.price}
                    note={problem && <p className="text-sm text-destructive">{problemText(problem, book)}</p>}
                  />
                )
              )}
            </ul>
          </Step>
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>
              <h2>{copy.summaryTitle}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{copy.itemsLine(count)}</span>
              {loaded ? <span className="tabular-nums">{formatPrice(subtotal)}</span> : <Skeleton className="h-4 w-16" />}
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>{copy.total}</span>
              {loaded ? (
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              ) : (
                <Skeleton className="h-5 w-20" />
              )}
            </div>
            {hasProblems && (
              <Alert variant="destructive" role="alert">
                <CircleAlertIcon />
                <AlertDescription>
                  {siteConfig.cart.fixProblems}{' '}
                  <Link to={routes.cart} className="underline underline-offset-4">
                    {siteConfig.cart.title}
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            {orderError && (
              <Alert variant="destructive" role="alert">
                <CircleAlertIcon />
                <AlertDescription>{orderError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button size="lg" className="w-full" disabled={!canPlace} onClick={placeOrder}>
              {placing && <Spinner />}
              {placing ? copy.placing : copy.placeOrder}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              {!isAdmin && !addressDone ? (
                copy.chooseAddress
              ) : (
                <>
                  <LockIcon className="size-3" aria-hidden="true" />
                  {copy.priceNote}
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}

export default CheckoutPage
