import { cn } from '@/lib/utils'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { siteConfig } from '@/config/site'

// Buttons sit on a dark photo, so the outline variant needs light text and border
const actionClassNames = {
  outline: 'border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white',
}

function Hero({ content = siteConfig.hero }) {
  const { title, description, image, actions } = content

  return (
    <section className="relative isolate overflow-hidden">
      <img
        src={image.src}
        alt={image.alt}
        className="absolute inset-0 -z-20 size-full object-cover"
        fetchPriority="high"
      />
      {/* Dimming layer keeps the copy readable over any photo */}
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/80 via-black/60 to-black/30" />

      <div className="mx-auto flex min-h-128 max-w-7xl flex-col items-start justify-center gap-6 px-4 py-24 text-white">
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-xl text-lg text-white/80">{description}</p>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className={buttonVariants({
                variant: action.variant,
                size: 'lg',
                className: cn(actionClassNames[action.variant]),
              })}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {image.credit && (
        <a
          href={image.credit.url}
          target="_blank"
          rel="noreferrer"
          className="absolute right-4 bottom-3 text-xs text-white/60 hover:text-white"
        >
          {image.credit.text}
        </a>
      )}
    </section>
  )
}

export { Hero }
