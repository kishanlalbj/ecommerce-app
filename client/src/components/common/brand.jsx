import { BookOpenIcon } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/config/site'

function Brand({ className, nameClassName }) {
  return (
    <Link
      to={siteConfig.routes.home}
      aria-label={siteConfig.name}
      className={cn('inline-flex shrink-0 items-center gap-2 font-heading', className)}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpenIcon className="size-4" />
      </span>
      <span className={cn('text-lg font-semibold tracking-tight', nameClassName)}>
        {siteConfig.name}
      </span>
    </Link>
  )
}

export { Brand }
