import { Route, Routes } from 'react-router'
import { GuestOnly } from '@/components/common/guest-only'
import { Hero } from '@/components/common/hero'
import { Layout } from '@/components/common/layout'
import { siteConfig } from '@/config/site'
import LoginPage from '@/pages/auth/login'
import SignupPage from '@/pages/auth/signup'

const { routes } = siteConfig

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Hero />} />
        <Route element={<GuestOnly />}>
          <Route path={routes.login} element={<LoginPage />} />
          <Route path={routes.signup} element={<SignupPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
