import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex h-screen w-screen">
      <aside className="flex w-56 flex-col border-r bg-card shadow-sm">
        <Link to="/" className="flex items-center gap-2 px-4 py-4 text-lg font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground shadow-sm">
            M
          </span>
          MinasCaixa
        </Link>
        <nav className="flex-1 space-y-1 px-2 text-sm">
          <NavItem to="/caixa" label="Caixa" hint="F-keys" />
          {isAdmin && (
            <>
              <div className="mt-4 px-2 text-xs uppercase tracking-wide text-muted-foreground">Admin</div>
              <NavItem to="/admin" label="Dashboard" />
              <NavItem to="/admin/promissorias" label="Promissórias" />
              <NavItem to="/admin/clientes" label="Clientes" />
              <NavItem to="/admin/fechamentos" label="Fechamentos" />
              <NavItem to="/admin/relatorios" label="Relatórios" />
            </>
          )}
        </nav>
        <div className="border-t p-3 text-xs">
          <div className="font-medium">{profile?.nome ?? '—'}</div>
          <div className="text-muted-foreground">{profile?.role ?? ''}</div>
          <button
            onClick={signOut}
            className="mt-2 w-full rounded border px-2 py-1 hover:bg-muted"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-muted/30">
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, label, hint }: { to: string; label: string; hint?: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-muted',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary',
        )
      }
    >
      <span>{label}</span>
      {hint && <kbd className="text-[10px]">{hint}</kbd>}
    </NavLink>
  )
}
