import { Route, Routes } from "react-router";
import { AccountLayout } from "@/components/account/account-layout";
import { GuestOnly } from "@/components/common/guest-only";
import { Layout } from "@/components/common/layout";
import { RequireAuth } from "@/components/common/require-auth";
import { siteConfig } from "@/config/site";
import AccountPage from "@/pages/account";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import BookPage from "@/pages/book";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import NotFoundPage from "@/pages/not-found";
import OrderPage from "@/pages/order";
import OrdersPage from "@/pages/orders";
import Landing from "./pages/landing";

const { routes } = siteConfig;

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Open to everyone: browsing and the cart don't need an account */}
        <Route index element={<Landing />} />
        <Route path={routes.book(":id")} element={<BookPage />} />
        <Route path={routes.cart} element={<CartPage />} />

        <Route element={<RequireAuth />}>
          <Route path={routes.checkout} element={<CheckoutPage />} />
          <Route path={routes.order(":id")} element={<OrderPage />} />
          <Route element={<AccountLayout />}>
            <Route path={routes.account} element={<AccountPage />} />
            <Route path={routes.orders} element={<OrdersPage />} />
          </Route>
        </Route>

        <Route element={<GuestOnly />}>
          <Route path={routes.login} element={<LoginPage />} />
          <Route path={routes.signup} element={<SignupPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
