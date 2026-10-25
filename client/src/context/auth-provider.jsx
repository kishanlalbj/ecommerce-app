import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/context/auth-context'
import { authApi } from '@/services/auth'
import { meApi } from '@/services/me'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // True while we check a token saved from a previous visit
  const [loading, setLoading] = useState(authApi.isLoggedIn)

  useEffect(() => {
    if (!authApi.isLoggedIn()) return
    // A 401 here clears the stored token (see api-client), leaving the user logged out
    meApi
      .get()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const loggedIn = await authApi.login(email, password)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const register = useCallback(async (data) => {
    const created = await authApi.register(data)
    setUser(created)
    return created
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, loading, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
