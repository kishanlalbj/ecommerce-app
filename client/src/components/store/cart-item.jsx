import { BookIcon, MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'

const { cart: copy, routes } = siteConfig

const problemText = (problem, book) =>
  problem === 'lowStock' ? copy.problems.lowStock(book.stock) : copy.problems[problem]

function RemoveButton({ onClick }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Trash2Icon data-icon="inline-start" />
      {copy.remove}
    </Button>
  )
}

// One line in the cart. item: { bookId, quantity, book, problem } where book is undefined while
// loading and null once it's gone from the catalog. Quantity changes are reported to the parent.
function CartItem({ item, onIncrease, onDecrease, onRemove, className }) {
  const { bookId, quantity, book, problem } = item

  if (book === undefined) {
    return (
      <li className={cn('flex gap-4 py-4', className)} aria-hidden="true">
        <Skeleton className="h-24 w-16 shrink-0 rounded-md" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-auto h-7 w-28" />
        </div>
      </li>
    )
  }

  if (book === null) {
    return (
      <li className={cn('flex items-center gap-4 py-4', className)}>
        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
          <BookIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-medium">{copy.unavailableTitle}</p>
          <p className="text-sm text-destructive">{copy.problems.unavailable}</p>
        </div>
        <RemoveButton onClick={onRemove} />
      </li>
    )
  }

  const { title, price, coverImageUrl, stock } = book

  return (
    <li className={cn('flex gap-4 py-4', className)}>
      <Link
        to={routes.book(bookId)}
        tabIndex={-1}
        aria-hidden="true"
        className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
      >
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <BookIcon className="size-6 text-muted-foreground" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <Link to={routes.book(bookId)} className="font-medium leading-snug hover:underline underline-offset-4">
            {title}
          </Link>
          <p className="shrink-0 font-medium tabular-nums">{formatPrice(Number(price) * quantity)}</p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{formatPrice(price)}</p>
        {problem && <p className="text-sm text-destructive">{problemText(problem, book)}</p>}

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label={`${copy.quantityLabel}: ${title}`}>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={copy.decrease}
              disabled={quantity <= 1}
              onClick={onDecrease}
            >
              <MinusIcon />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={copy.increase}
              disabled={quantity >= stock}
              onClick={onIncrease}
            >
              <PlusIcon />
            </Button>
          </div>

          <RemoveButton onClick={onRemove} />
        </div>
      </div>
    </li>
  )
}

export { CartItem }
