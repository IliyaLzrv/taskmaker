import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode' // named import

type Role = 'ADMIN' | 'USER'
export type User = { id: string; email: string; role: Role }
type TokenPayload = { sub: string; email: string; role: Role; exp: number }

type AuthContextType = {
  user: User | null
  authToken: string | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: { email: string; password: string; fullName?: string }) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function parseUserFromToken(t: string): User {
  const d = jwtDecode<TokenPayload>(t)
  return { id: d.sub, email: d.email, role: d.role }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load persisted token on boot
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

  const login: AuthContextType['login'] = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Login failed' }))
      throw new Error(message || 'Login failed')
    }
    // ✅ ensure token is a string
    const data = await res.json()
    const t = data?.token
    if (typeof t !== 'string') {
      console.error('Bad token from server:', data)
      throw new Error('Invalid token from server')
    }
    const u = parseUserFromToken(t)

    localStorage.setItem('auth_token', t)
    setAuthToken(t)
    setUser(u)
    return u
  }

  // (inside AuthProvider)
  const register: AuthContextType['register'] = async ({ email, password, fullName }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    })
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: 'Register failed' }))
      throw new Error(message || 'Register failed')
    }
    // ✅ ensure token is a string
    const data = await res.json()
    const t = data?.token
    if (typeof t !== 'string') {
      console.error('Bad token from server:', data)
      throw new Error('Invalid token from server')
    }
    const u = parseUserFromToken(t)

    localStorage.setItem('auth_token', t)
    setAuthToken(t)
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setAuthToken(null)
    setUser(null)
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{ user, authToken, loading, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
