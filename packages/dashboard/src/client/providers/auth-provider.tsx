/**
 * AuthProvider — single source of truth for JWT auth state across the app.
 * Wraps the app so every component can read user/login/logout via useAuthContext().
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { AuthContext } from '../hooks/use-auth'

const ACCESS_TOKEN_KEY = 'ocr_access_token'
const REFRESH_TOKEN_KEY = 'ocr_refresh_token'

type User = {
  id: string
  email: string
  name: string
  plan: string
  is_verified: boolean
  avatar_url: string | null
}

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
    ...((init?.headers as Record<string, string>) ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(path, { ...init, headers })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshToken) return
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        if (res.ok) {
          const data = await res.json()
          storeTokens(data.access_token, data.refresh_token)
          scheduleRefresh()
        } else {
          clearTokens()
          setUser(null)
        }
      } catch {
        // network error — stay logged in, will fail on next real request
      }
    }, 6 * 60 * 1000) // refresh every 6 min (access token is 7-day but keep session alive)
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }
    apiFetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) {
          setUser(u)
          scheduleRefresh()
        } else {
          clearTokens()
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [scheduleRefresh])

  const login = useCallback(
    async (email: string, password: string) => {
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
      scheduleRefresh()
    },
    [scheduleRefresh],
  )

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
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
      scheduleRefresh()
    },
    [scheduleRefresh],
  )

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    clearTokens()
    setUser(null)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
  }, [])

  const getAccessToken = useCallback(() => getStoredToken(), [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}
