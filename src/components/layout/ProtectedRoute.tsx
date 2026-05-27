import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

interface Props {
  requiredRole?: 'operador' | 'admin'
}

export function ProtectedRoute({ requiredRole }: Props) {
  const location = useLocation()
  const { user, profile, loading, initialized } = useAuthStore()

  if (loading || !initialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
