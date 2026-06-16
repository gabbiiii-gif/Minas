import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { pageTransition, staggerContainer, staggerItem } from '@/lib/motion'

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen">
      <aside className="flex w-56 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 shadow-xl">
        <Link to="/" className="flex items-center gap-2 px-4 py-4 text-lg font-bold tracking-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black text-white shadow-md shadow-amber-500/30">
            M
          </span>
          MinasCaixa
        </Link>

        <motion.nav
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 space-y-1 px-2 text-sm"
        >
          <NavItem to="/caixa" label="Caixa" hint="F-keys" />
          {isAdmin && (
            <>
              <motion.div variants={staggerItem} className="mt-4 px-2 text-xs uppercase tracking-wide text-slate-500">
                Admin
              </motion.div>
              <NavItem to="/admin" label="Dashboard" />
              <NavItem to="/admin/promissorias" label="Promissórias" />
              <NavItem to="/admin/clientes" label="Clientes" />
              <NavItem to="/admin/fechamentos" label="Fechamentos" />
              <NavItem to="/admin/relatorios" label="Relatórios" />
            </>
          )}
        </motion.nav>

        <div className="border-t border-slate-800 p-3 text-xs">
          <div className="font-medium text-white">{profile?.nome ?? '—'}</div>
          <div className="text-slate-400">{profile?.role ?? ''}</div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700 px-2 py-1.5 text-slate-200 transition-colors hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-300"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-muted/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="show"
            exit="exit"
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function NavItem({ to, label, hint }: { to: string; label: string; hint?: string }) {
  return (
    <motion.div variants={staggerItem}>
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          cn(
            'relative flex items-center justify-between rounded-md px-3 py-2 transition-colors',
            isActive
              ? 'bg-slate-800 font-medium text-white'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-amber-400"
              />
            )}
            <span>{label}</span>
            {hint && <kbd className="border-slate-700 bg-slate-800 text-[10px] text-slate-400">{hint}</kbd>}
          </>
        )}
      </NavLink>
    </motion.div>
  )
}
