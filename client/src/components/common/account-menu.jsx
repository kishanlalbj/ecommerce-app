import { LogOutIcon, PackageIcon, UserIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'

const { routes, header } = siteConfig
const { accountMenu } = header

function AccountMenu() {
  const { user, isAdmin, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Avoid flashing "Log in" while a saved session is being restored
  if (loading) return <div className="size-8" aria-hidden />

  if (!user) {
    return (
      <Link
        to={routes.login}
        // Lets the login page send the user back here afterwards
        state={{ from: location.pathname + location.search }}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <UserIcon data-icon="inline-start" />
        {header.login}
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={header.accountLabel} />}
      >
        <UserIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 font-medium text-foreground">
              {user.name}
              {isAdmin && <Badge variant="secondary">{accountMenu.adminBadge}</Badge>}
            </span>
            <span className="truncate text-xs font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate(routes.account)}>
            <UserIcon />
            {accountMenu.account}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(routes.orders)}>
            <PackageIcon />
            {accountMenu.orders}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            logout()
            navigate(routes.home)
          }}
        >
          <LogOutIcon />
          {accountMenu.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AccountMenu }
