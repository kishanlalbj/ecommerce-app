import { Outlet } from 'react-router'
import { Footer } from '@/components/common/footer'
import { Header } from '@/components/common/header'

function Layout({ cartCount }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header cartCount={cartCount} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export { Layout }
