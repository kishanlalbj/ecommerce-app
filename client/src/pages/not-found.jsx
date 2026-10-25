import { Link } from 'react-router'
import { BookX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { siteConfig } from '@/config/site'

function NotFoundPage({ content = siteConfig.notFound }) {
  const { code, title, description, actions } = content

  return (
    <section className="mx-auto flex min-h-128 max-w-7xl px-4 py-24">
      <Empty>
        <EmptyHeader>
          <EmptyMedia className="text-muted-foreground">
            <BookX className="size-12" aria-hidden="true" />
          </EmptyMedia>
          <p className="font-heading text-6xl font-semibold tracking-tight">{code}</p>
          <EmptyTitle className="text-xl">
            <h1>{title}</h1>
          </EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center">
          {actions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className={buttonVariants({ variant: action.variant, size: 'lg' })}
            >
              {action.label}
            </Link>
          ))}
        </EmptyContent>
      </Empty>
    </section>
  )
}

export default NotFoundPage
