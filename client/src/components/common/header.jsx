import { SearchIcon, ShoppingCartIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { AccountMenu } from '@/components/common/account-menu'
import { Brand } from '@/components/common/brand'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { siteConfig } from '@/config/site'

const { routes, header } = siteConfig

function Header({ cartCount = 0 }) {
  const navigate = useNavigate()

  function handleSearch(event) {
    event.preventDefault()
    const q = new FormData(event.currentTarget).get('q').trim()
    navigate(q ? `${routes.search}?${new URLSearchParams({ q })}` : routes.search)
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Brand nameClassName="hidden sm:inline" />

        <form role="search" onSubmit={handleSearch} className="ml-auto w-full max-w-md">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              name="q"
              placeholder={header.searchPlaceholder}
              aria-label={header.searchLabel}
            />
          </InputGroup>
        </form>

        <div className="flex items-center gap-1">
          <AccountMenu />
          <Link
            to={routes.cart}
            aria-label={`${header.cartLabel} (${cartCount})`}
            className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'relative' })}
          >
            <ShoppingCartIcon />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                {cartCount}
              </Badge>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export { Header }
