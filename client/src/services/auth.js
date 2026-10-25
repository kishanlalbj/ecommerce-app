import { api } from '@/lib/api-client'
import { tokenStore } from '@/lib/token-store'

async function withSession(request) {
  const { user, token } = await request
  tokenStore.set(token)
  return user
}

export const authApi = {
  register: (data) => withSession(api.post('/auth/register', data)),
  login: (email, password) => withSession(api.post('/auth/login', { email, password })),
  logout: () => tokenStore.clear(),
  isLoggedIn: () => Boolean(tokenStore.get()),
}
