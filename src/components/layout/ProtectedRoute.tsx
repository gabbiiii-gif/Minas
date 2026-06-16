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
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <span className="text-sm text-muted-foreground">Carregando…</span>
        </div>
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
