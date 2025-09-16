/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

type Role = 'ADMIN' | 'USER'
export type User = { id: string; email: string; role: Role }
type TokenPayload = { sub: string; email: string; role: Role; exp: number }

type AuthContextType = {
  user: User | null
  authToken: string | null
  loading: boolean
  isAdmin: boolean
  session: number
  login: (email: string, password: string) => Promise<User>
  register: (data: { email: string; password: string; fullName?: string }) => Promise<User>
  logout: () => void
  refreshMe: () => Promise<void>
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function parseUserFromToken(t: string): User {
  const d = jwtDecode<TokenPayload>(t)
  return { id: d.sub, email: d.email, role: d.role }
}

declare global {
  interface Window {
    __auth_inflight_login?: Promise<User> | null
    __auth_inflight_register?: Promise<User> | null
    __auth_inflight_refresh?: Promise<void> | null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(0)

  useEffect(() => {
    const t = localStorage.getItem('auth_token')
    if (t) {
      try {
        const d = jwtDecode<TokenPayload>(t)
        if (d.exp * 1000 > Date.now()) {
          setAuthToken(t)
          setUser({ id: d.sub, email: d.email, role: d.role })
        } else {
          localStorage.removeItem('auth_token')
        }
      } catch {
        localStorage.removeItem('auth_token')
      }
    }
    setLoading(false)
  }, [])

  const authFetch: AuthContextType['authFetch'] = useMemo(() => {
    return async (input, init = {}) => {
      const headers = new Headers(init.headers || {})
      headers.set('Cache-Control', 'no-store')
      if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
      const res = await fetch(input, { ...init, headers })
      if (res.status === 401) {
        localStorage.removeItem('auth_token')
        setAuthToken(null)
        setUser(null)
        setSession(s => s + 1)
      }
      return res
    }
  }, [authToken])

  const refreshMe = async () => {
    if (!authToken) {
      setUser(null)
      return
    }
    if (window.__auth_inflight_refresh) return window.__auth_inflight_refresh
    window.__auth_inflight_refresh = (async () => {
      try {
        const r = await authFetch('/api/users/me')
        if (!r.ok) throw new Error('me failed')
        const me = (await r.json()) as User
        setUser(me)
      } catch {
        localStorage.removeItem('auth_token')
        setAuthToken(null)
        setUser(null)
        setSession(s => s + 1)
      } finally {
        window.__auth_inflight_refresh = null
      }
    })()
    return window.__auth_inflight_refresh
  }

  const login: AuthContextType['login'] = async (email, password) => {
    if (window.__auth_inflight_login) return window.__auth_inflight_login
    window.__auth_inflight_login = (async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Login failed' }))
        window.__auth_inflight_login = null
        throw new Error(message || 'Login failed')
      }
      const data = await res.json()
      const t: string = data?.token
      if (typeof t !== 'string') {
        window.__auth_inflight_login = null
        throw new Error('Invalid token from server')
      }

      localStorage.setItem('auth_token', t)
      setAuthToken(t)
      const u = parseUserFromToken(t)
      setUser(u)

      await refreshMe()         
      setSession(s => s + 1)     
      window.__auth_inflight_login = null
      return u
    })()
    return window.__auth_inflight_login
  }

  const register: AuthContextType['register'] = async ({ email, password, fullName }) => {
    if (window.__auth_inflight_register) return window.__auth_inflight_register
    window.__auth_inflight_register = (async () => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ email, password, fullName }),
      })
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Register failed' }))
        window.__auth_inflight_register = null
        throw new Error(message || 'Register failed')
      }
      const data = await res.json()
      const t: string = data?.token
      if (typeof t !== 'string') {
        window.__auth_inflight_register = null
        throw new Error('Invalid token from server')
      }

      localStorage.setItem('auth_token', t)
      setAuthToken(t)
      const u = parseUserFromToken(t)
      setUser(u)

      await refreshMe()
      setSession(s => s + 1)
      window.__auth_inflight_register = null
      return u
    })()
    return window.__auth_inflight_register
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setAuthToken(null)
    setUser(null)
    setSession(s => s + 1)
  }

useEffect(() => {
  let mounted = true
  const t = localStorage.getItem('auth_token')

  async function boot() {
    try {
      if (t) {
        try {
          const d = jwtDecode<TokenPayload>(t)
          if (d.exp * 1000 > Date.now()) {
            if (mounted) {
              setAuthToken(t)
              setUser({ id: d.sub, email: d.email, role: d.role })
            }
            await refreshMe()
          } else {
            localStorage.removeItem('auth_token')
          }
        } catch {
          localStorage.removeItem('auth_token')
        }
      } else {
        if (mounted) setUser(null)
      }
    } finally {
      if (mounted) setLoading(false) 
    }
  }
  boot()

  return () => { mounted = false }
}, [])


  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken,
        loading,
        isAdmin,
        session,
        login,
        register,
        logout,
        refreshMe,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
