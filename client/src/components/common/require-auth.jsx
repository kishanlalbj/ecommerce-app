import { Navigate, Outlet, useLocation } from 'react-router'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'

// Browsing is open to everyone; only steps like checkout need an account.
// Guests are sent to log in, then brought back here (see use-auth-form).
function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) {
    return (
      <Navigate
        to={siteConfig.routes.login}
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }
  return <Outlet />
}

export { RequireAuth }
