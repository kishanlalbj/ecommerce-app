import { Brand } from '@/components/common/brand'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { siteConfig } from '@/config/site'

const { newsletter, footer } = siteConfig

function Footer({ onSubscribe }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubscribe?.(new FormData(e.currentTarget).get('email'))
  }

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Brand />
          <p className="max-w-xs text-sm text-muted-foreground">
            {siteConfig.description}
          </p>
          <form className="flex max-w-xs gap-2" onSubmit={handleSubmit}>
            <Input
              type="email"
              name="email"
              required
              placeholder={newsletter.placeholder}
              aria-label={newsletter.label}
            />
            <Button type="submit">{newsletter.button}</Button>
          </form>
        </div>

        {footer.groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">{group.title}</h3>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. {footer.rights}
        </p>
        <p>{siteConfig.tagline}</p>
      </div>
    </footer>
  )
}

export { Footer }
