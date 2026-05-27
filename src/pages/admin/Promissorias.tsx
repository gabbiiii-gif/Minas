import { useEffect, useState } from 'react'
import { centsToBRL } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'

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
          <h1 className="text-2xl font-bold">Promissórias em aberto</h1>
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
        <table className="w-full border-collapse text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="py-2">Cliente</th>
              <th>Original</th>
              <th>Pago</th>
              <th>Saldo</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id ?? ''} className={cn('border-b', p.atrasada && 'bg-red-50')}>
                <td className="py-2">{p.cliente_nome}</td>
                <td className="font-mono">{centsToBRL(p.valor_original ?? 0)}</td>
                <td className="font-mono">{centsToBRL(p.valor_pago ?? 0)}</td>
                <td className="font-mono font-semibold">{centsToBRL(p.saldo ?? 0)}</td>
                <td>{p.vencimento ?? '—'}{p.atrasada ? ' ⚠️' : ''}</td>
                <td><span className="rounded bg-muted px-2 py-0.5 text-xs">{p.status}</span></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sem promissórias.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
