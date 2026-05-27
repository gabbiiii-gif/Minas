import { FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

export default function Login() {
  const location = useLocation()
  const { user, signIn, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (user) {
    const dest = (location.state as { from?: string })?.from ?? '/caixa'
    return <Navigate to={dest} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { error } = await signIn(email.trim(), password)
    if (error) {
      toast.error('Falha no login', { description: error })
    } else {
      toast.success('Login realizado')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm"
      >
        <h1 className="mb-1 text-2xl font-bold">MinasCaixa</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Livro Caixa — Minas Auto Peças
        </p>
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
        />
        <label className="mb-2 block text-sm font-medium">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
