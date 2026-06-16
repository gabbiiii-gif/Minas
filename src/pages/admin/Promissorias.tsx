import { useEffect, useState } from 'react'
import { centsToBRL } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { BlurText } from '@/components/reactbits/BlurText'

type Aberta = Database['public']['Views']['vw_promissorias_em_aberto']['Row']
type Status = 'todas' | 'aberta' | 'parcial' | 'atrasadas'

export default function Promissorias() {
  const [items, setItems] = useState<Aberta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Status>('todas')

  async function load() {
    setLoading(true)
    let q = supabase.from('vw_promissorias_em_aberto').select('*').order('vencimento', { ascending: true, nullsFirst: false })
    if (filtro === 'aberta') q = q.eq('status', 'aberta')
    else if (filtro === 'parcial') q = q.eq('status', 'parcial')
    else if (filtro === 'atrasadas') q = q.eq('atrasada', true)
    const { data, error } = await q.limit(500)
    if (!error) setItems((data ?? []) as Aberta[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [filtro])

  const totalSaldo = items.reduce((s, i) => s + (i.saldo ?? 0), 0)

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"><BlurText text="Promissórias em aberto" /></h1>
          <p className="text-sm text-muted-foreground">{items.length} promissória(s) — saldo total {centsToBRL(totalSaldo)}</p>
        </div>
        <div className="flex gap-1">
          {(['todas', 'aberta', 'parcial', 'atrasadas'] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={cn(
                'rounded-md border px-3 py-1 text-xs capitalize hover:bg-muted',
                filtro === s && 'bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="overflow-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/80 text-left backdrop-blur">
              <tr>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-2">Original</th>
                <th className="px-2">Pago</th>
                <th className="px-2">Saldo</th>
                <th className="px-2">Vencimento</th>
                <th className="px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id ?? ''} className={cn('border-b transition-colors hover:bg-muted/40', p.atrasada && 'bg-red-50 hover:bg-red-100')}>
                  <td className="px-4 py-2">{p.cliente_nome}</td>
                  <td className="px-2 font-mono">{centsToBRL(p.valor_original ?? 0)}</td>
                  <td className="px-2 font-mono">{centsToBRL(p.valor_pago ?? 0)}</td>
                  <td className="px-2 font-mono font-semibold">{centsToBRL(p.saldo ?? 0)}</td>
                  <td className="px-2">{p.vencimento ?? '—'}{p.atrasada ? ' ⚠️' : ''}</td>
                  <td className="px-2">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      p.status === 'parcial' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground',
                    )}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sem promissórias.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
