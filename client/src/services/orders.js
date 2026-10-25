import { api } from '@/lib/api-client'

export const ordersApi = {
  // Customers get their own orders; admins get every order
  list: () => api.get('/orders'),
  get: (id) => api.get(`/orders/${id}`),
  place: (items, shippingAddressId) => api.post('/orders', { items, shippingAddressId }),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  // Returns { url } of the Stripe Checkout page to send the customer to
  pay: (id) => api.post(`/orders/${id}/pay`),

  // Admin only
  setStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
}
