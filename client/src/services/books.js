import { api } from '@/lib/api-client'

// One file per backend resource keeps endpoint paths out of components
export const booksApi = {
  list: (query, options) => api.get('/books', { query, ...options }),
  get: (id, options) => api.get(`/books/${id}`, options),

  // Admin only
  create: (book) => api.post('/books', book),
  update: (id, data) => api.patch(`/books/${id}`, data),
  remove: (id) => api.delete(`/books/${id}`),
}
