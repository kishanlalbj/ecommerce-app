import { Outlet } from 'react-router'
import { Footer } from '@/components/common/footer'
import { Header } from '@/components/common/header'
import { useCart } from '@/context/cart-context'

function Layout() {
  const { count } = useCart()

  return (
    <div className="flex min-h-svh flex-col">
      <Header cartCount={count} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export { Layout }
