import { BookIcon } from 'lucide-react'
import { Link } from 'react-router'
import { siteConfig } from '@/config/site'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const { routes } = siteConfig

// A read-only line in an order or checkout review: cover, title, quantity × price, line total
function OrderLine({ bookId, title, coverImageUrl, quantity, unitPrice, note, className }) {
  return (
    <li className={cn('flex gap-4 py-4', className)}>
      <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <BookIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <Link to={routes.book(bookId)} className="font-medium leading-snug underline-offset-4 hover:underline">
            {title}
          </Link>
          <p className="shrink-0 font-medium tabular-nums">{formatPrice(Number(unitPrice) * quantity)}</p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {quantity} × {formatPrice(unitPrice)}
        </p>
        {note}
      </div>
    </li>
  )
}

export { OrderLine }
