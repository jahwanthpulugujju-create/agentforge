/**
 * RequireAuth — redirect to /login if user is not authenticated.
 * Shows a blank loader during the initial token check so there's no flash.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../hooks/use-auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
