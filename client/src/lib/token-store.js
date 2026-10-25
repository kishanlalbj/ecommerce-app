const KEY = 'auth.token'

// Storage can be unavailable (private mode, blocked site data), so every access is guarded
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      // Not persisted; the user will need to log in again after a reload
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Nothing to clear
    }
  },
}
