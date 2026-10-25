import { Navigate, Outlet } from 'react-router'
import { siteConfig } from '@/config/site'
import { useAuth } from '@/context/auth-context'

// Login and sign-up make no sense when already signed in
function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={siteConfig.routes.home} replace />
  return <Outlet />
}

export { GuestOnly }
