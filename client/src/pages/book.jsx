import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BookIcon, MinusIcon, PlusIcon, ShoppingCartIcon, StarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { useCart } from '@/context/cart-context'
import { useAddToCart } from '@/hooks/use-add-to-cart'
import { api } from '@/lib/api-client'
import { formatDate, formatLanguage, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import NotFoundPage from '@/pages/not-found'

const { bookDetail: copy, bookCard, filters, routes } = siteConfig

const LOW_STOCK = 5
const formatLabel = (value) => filters.formats.find((f) => f.value === value)?.label ?? value

function Stars({ rating, className }) {
  return (
    <span className={cn('flex items-center gap-0.5', className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={cn(
            'size-4',
            n <= Math.round(rating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'
          )}
        />
      ))}
    </span>
  )
}

function BookDetailSkeleton() {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_1fr]" aria-hidden="true">
      <Skeleton className="aspect-2/3 w-full rounded-lg" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-8 w-24" />
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="mt-6 h-24 w-full" />
      </div>
    </div>
  )
}

function QuantityPicker({ value, max, onChange }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={copy.quantityLabel}>
      <Button
        variant="outline"
        size="icon"
        aria-label={copy.decrease}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon />
      </Button>
      <span className="w-10 text-center tabular-nums" aria-live="polite">
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label={copy.increase}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

function Reviews({ reviews }) {
  const count = reviews.length
  const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0
  const newestFirst = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="reviews-title" className="font-heading text-2xl font-semibold">
          {copy.reviews.title}
        </h2>
        {count > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars rating={avg} />
            {copy.reviews.summary(avg, count)}
          </p>
        )}
      </div>

      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.reviews.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y border-y">
          {newestFirst.map((review) => (
            <li key={review.id} className="flex flex-col gap-1.5 py-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars rating={review.rating} />
                <span className="sr-only">{copy.reviews.stars(review.rating)}</span>
                {review.title && <h3 className="font-medium">{review.title}</h3>}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
              {review.body && <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BookDetail({ id }) {
  const [book, setBook] = useState(null)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const { items } = useCart()
  const addToCart = useAddToCart()

  useEffect(() => {
    const controller = new AbortController()
    const fetchBook = async () => {
      try {
        setError(null)
        setBook(await api.get(`/books/${id}`, { signal: controller.signal }))
      } catch (err) {
        if (!controller.signal.aborted) setError(err)
      }
    }

    fetchBook()
    return () => controller.abort()
  }, [id, retry])

  // 400 means the id isn't a number, which is just as missing as an unknown id
  if (error?.status === 404 || error?.status === 400) return <NotFoundPage content={copy.notFound} />

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-24">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{copy.error}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
              {copy.retry}
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    )
  }

  if (!book) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10" role="status" aria-label={siteConfig.loading}>
        <BookDetailSkeleton />
      </section>
    )
  }

  const authors = book.bookAuthors.map((ba) => ba.author.name)
  const categories = book.bookCategories.map((bc) => bc.category)
  // The most specific category makes the best breadcrumb ("Fantasy" over "Fiction")
  const crumb = categories.find((c) => c.parentId != null) ?? categories[0]

  const inCart = items.find((item) => item.bookId === book.id)?.quantity ?? 0
  const available = Math.max(book.stock - inCart, 0)
  const soldOut = book.stock === 0

  const reviewCount = book.reviews.length
  const avgRating = reviewCount ? book.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : null

  const details = [
    [copy.details.format, formatLabel(book.format)],
    [copy.details.pages, book.pages],
    [copy.details.publisher, book.publisher?.name],
    [copy.details.publishedDate, book.publishedDate && formatDate(book.publishedDate)],
    [copy.details.language, formatLanguage(book.language)],
    [copy.details.isbn, book.isbn],
  ].filter(([, value]) => value != null && value !== '')

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-10">
      <div className="flex flex-col gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={routes.home} />}>{copy.home}</BreadcrumbLink>
            </BreadcrumbItem>
            {crumb && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link to={`${routes.home}?category=${crumb.slug}`} />}>
                    {crumb.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">{book.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
          <div className="aspect-2/3 w-full max-w-xs self-start overflow-hidden rounded-lg bg-muted md:max-w-none">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <BookIcon className="size-16 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {book.title}
              </h1>
              {book.subtitle && <p className="text-lg text-muted-foreground">{book.subtitle}</p>}
              {authors.length > 0 && (
                <p>
                  <span className="text-muted-foreground">{copy.by} </span>
                  {authors.join(', ')}
                </p>
              )}
              {avgRating != null && (
                <a href="#reviews-title" className="flex w-fit items-center gap-2 text-sm hover:underline">
                  <Stars rating={avgRating} />
                  <span>{copy.reviews.summary(avgRating, reviewCount)}</span>
                </a>
              )}
              {categories.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Badge variant="secondary" render={<Link to={`${routes.home}?category=${c.slug}`} />}>
                        {c.name}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-lg border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-3xl font-semibold tabular-nums">{formatPrice(book.price)}</span>
                {soldOut ? (
                  <Badge variant="outline">{bookCard.outOfStock}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {book.stock <= LOW_STOCK ? bookCard.lowStock(book.stock) : copy.inStock}
                  </span>
                )}
              </div>

              {!soldOut && (
                <div className="flex flex-wrap items-center gap-3">
                  <QuantityPicker
                    value={Math.min(quantity, Math.max(available, 1))}
                    max={available}
                    onChange={setQuantity}
                  />
                  <Button
                    size="lg"
                    className="flex-1"
                    disabled={available === 0}
                    onClick={() => {
                      addToCart(book, Math.min(quantity, available))
                      setQuantity(1)
                    }}
                  >
                    <ShoppingCartIcon data-icon="inline-start" />
                    {copy.addToCart}
                  </Button>
                </div>
              )}
              {inCart > 0 && (
                <p className="text-sm text-muted-foreground">
                  <Link to={routes.cart} className="underline underline-offset-4 hover:text-foreground">
                    {copy.inCart(inCart)}
                  </Link>
                </p>
              )}
            </div>

            {book.description && (
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-xl font-semibold">{copy.descriptionTitle}</h2>
                <p className="leading-relaxed whitespace-pre-line">{book.description}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-xl font-semibold">{copy.detailsTitle}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {details.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <Reviews reviews={book.reviews} />
    </section>
  )
}

// Keyed by id so moving between books starts with fresh state instead of the last book's
function BookPage() {
  const { id } = useParams()
  return <BookDetail key={id} id={id} />
}

export default BookPage
