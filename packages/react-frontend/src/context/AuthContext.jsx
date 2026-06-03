import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth.js'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    authApi.fetchCurrentUser()
      .then((u) => { if (!cancelled) setUser(u) })
      .catch(() => { if (!cancelled) setUser(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (email, password) => {
    const { user: u } = await authApi.loginWithEmail(email, password)
    setUser(u)
  }, [])

  const register = useCallback(async (email, password, name) => {
    const { user: u } = await authApi.register(email, password, name)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
  }, [])

  const updateUser = useCallback((partial) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
