import { api } from '@/lib/api-client'

// The logged-in user's own profile and addresses
export const meApi = {
  get: () => api.get('/me').then((d) => d.user),
  update: (data) => api.patch('/me', data).then((d) => d.user),
  changePassword: (currentPassword, newPassword) =>
    api.put('/me/password', { currentPassword, newPassword }),

  listAddresses: () => api.get('/me/addresses'),
  addAddress: (address) => api.post('/me/addresses', address),
  updateAddress: (id, data) => api.patch(`/me/addresses/${id}`, data),
  removeAddress: (id) => api.delete(`/me/addresses/${id}`),
}
