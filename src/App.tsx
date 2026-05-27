import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Caixa from '@/pages/caixa/Caixa'
import Dashboard from '@/pages/admin/Dashboard'
import Clientes from '@/pages/admin/Clientes'
import Promissorias from '@/pages/admin/Promissorias'
import Relatorios from '@/pages/admin/Relatorios'
import NotFound from '@/pages/NotFound'
import Forbidden from '@/pages/Forbidden'

export default function App() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    init()
  }, [init])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/caixa" replace />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/clientes" element={<Clientes />} />
            <Route path="/admin/promissorias" element={<Promissorias />} />
            <Route path="/admin/relatorios" element={<Relatorios />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
