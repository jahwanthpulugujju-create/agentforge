/**
 * Auth hook — manages JWT tokens, login/register/logout.
 */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const BASE = ''

type User = {
  id: string
  email: string
  name: string
  plan: string
  is_verified: boolean
  avatar_url: string | null
}

type AuthContext = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => string | null
}

const ACCESS_TOKEN_KEY = 'ocr_access_token'
const REFRESH_TOKEN_KEY = 'ocr_refresh_token'

function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(BASE + path, { ...init, headers })
}

export function useAuth(): AuthContext {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, try to restore session
  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }
    apiFetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Login failed')
    }
    const data = await res.json()
    storeTokens(data.access_token, data.refresh_token)
    setUser(data.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Registration failed')
    }
    const data = await res.json()
    storeTokens(data.access_token, data.refresh_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    clearTokens()
    setUser(null)
  }, [])

  const getAccessToken = useCallback(() => getStoredToken(), [])

  return { user, loading, login, register, logout, getAccessToken }
}

export const AuthContext = createContext<AuthContext>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  getAccessToken: () => null,
})

export const useAuthContext = () => useContext(AuthContext)
