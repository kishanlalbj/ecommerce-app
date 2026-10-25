import { BookIcon, ShoppingCartIcon, StarIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'

const { bookCard: copy, filters, routes } = siteConfig

const LOW_STOCK = 5
const formatLabel = (value) => filters.formats.find((f) => f.value === value)?.label ?? value

// avgRating is null until the book has a review; the line always renders so cards stay the same height
function Rating({ avgRating, reviewCount = 0 }) {
  if (avgRating == null || reviewCount === 0) {
    return <p className="text-xs text-muted-foreground">{copy.noReviews}</p>
  }
  return (
    <p className="flex items-center gap-1 text-xs" aria-label={copy.rating(avgRating, reviewCount)}>
      <StarIcon className="size-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
      <span className="font-medium tabular-nums" aria-hidden="true">
        {avgRating.toFixed(1)}
      </span>
      <span className="text-muted-foreground tabular-nums" aria-hidden="true">
        ({reviewCount})
      </span>
    </p>
  )
}

// Links to the book's page by default; pass href to send it somewhere else
function BookCard({ book, href, authors = [], onAddToCart, className }) {
  const { id, title, price, coverImageUrl, format, stock } = book
  const to = href ?? routes.book(id)
  const soldOut = stock === 0

  return (
    <article className={cn('group flex flex-col gap-3', className)}>
      <Link
        to={to}
        className="relative block aspect-2/3 overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookIcon className="size-10 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        {format && (
          <Badge variant="secondary" className="absolute top-2 left-2">
            {formatLabel(format)}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 font-medium leading-snug">
          <Link to={to} className="hover:underline underline-offset-4">
            {title}
          </Link>
        </h3>
        {authors.length > 0 && (
          <p className="line-clamp-1 text-sm text-muted-foreground">{authors.join(', ')}</p>
        )}
        <Rating avgRating={book.avgRating} reviewCount={book.reviewCount} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="font-semibold tabular-nums">{formatPrice(price)}</span>
          {soldOut ? (
            <Badge variant="outline">{copy.outOfStock}</Badge>
          ) : (
            stock != null &&
            stock <= LOW_STOCK && (
              <span className="text-xs text-muted-foreground">{copy.lowStock(stock)}</span>
            )
          )}
        </div>
      </div>

      <Button variant="outline" disabled={soldOut} onClick={() => onAddToCart?.(book)}>
        <ShoppingCartIcon data-icon="inline-start" />
        {copy.addToCart}
      </Button>
    </article>
  )
}

// Same shape as BookCard so the grid doesn't jump when books arrive
function BookCardSkeleton({ className }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
      <Skeleton className="aspect-2/3 w-full rounded-lg" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="mt-1.5 h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  )
}

// A full grid of placeholders, announced once to screen readers
function BookGridSkeleton({ count = 8, className }) {
  return (
    <div
      role="status"
      aria-label={siteConfig.loading}
      className={cn('grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  )
}

export { BookCard, BookCardSkeleton, BookGridSkeleton }
