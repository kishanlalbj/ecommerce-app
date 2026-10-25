import { Navigate, Outlet, useLocation } from 'react-router'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'

// Login and sign-up make no sense when already signed in
function GuestOnly() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  // Honour "where to go after login" so a guest heading to checkout ends up there
  if (user) return <Navigate to={location.state?.from ?? siteConfig.routes.home} replace />
  return <Outlet />
}

export { GuestOnly }
