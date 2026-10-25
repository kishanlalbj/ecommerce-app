import { PackageIcon, UserIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

const { nav } = siteConfig.account
const ICONS = { user: UserIcon, orders: PackageIcon }

// Side navigation shared by the account pages. Stacks above the content on small screens.
function AccountLayout() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[13rem_1fr] md:items-start">
      <nav aria-label={nav.label} className="md:sticky md:top-24">
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {nav.links.map(({ label, href, icon }) => {
            const Icon = ICONS[icon]
            return (
              <li key={href}>
                <NavLink
                  to={href}
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                      isActive && 'bg-muted font-medium text-foreground'
                    )
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </section>
  )
}

// Title + intro line at the top of each account page
function AccountHeader({ title, description, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children}
    </header>
  )
}

export { AccountHeader, AccountLayout }
