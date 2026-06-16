import { useEffect, useState } from 'react'
import { centsToBRL } from '@/lib/money'
import { hojeBelem } from '@/lib/date'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import type { Database } from '@/types/database'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { BlurText } from '@/components/reactbits/BlurText'
import { CountUp } from '@/components/reactbits/CountUp'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem, useTilt3d } from '@/lib/motion'

type Venda = Database['public']['Tables']['vendas']['Row']
type Recebimento = Database['public']['Tables']['recebimentos_promissoria']['Row']
type Despesa = Database['public']['Tables']['despesas']['Row']
type Fechamento = Database['public']['Tables']['fechamentos_caixa']['Row']
type PromissoriaAberta = Database['public']['Views']['vw_promissorias_em_aberto']['Row']

export default function Dashboard() {
  const hoje = hojeBelem()

  const vendas = useRealtimeTable<Venda>({
    table: 'vendas',
    filter: { column: 'data', value: hoje },
    initialQuery: async () => {
      const { data, error } = await supabase.from('vendas').select('*').eq('data', hoje).is('deleted_at', null)
      if (error) throw error
      return data ?? []
    },
  })
  const recebimentos = useRealtimeTable<Recebimento>({
    table: 'recebimentos_promissoria',
    filter: { column: 'data', value: hoje },
    initialQuery: async () => {
      const { data, error } = await supabase.from('recebimentos_promissoria').select('*').eq('data', hoje)
      if (error) throw error
      return data ?? []
    },
  })
  const despesas = useRealtimeTable<Despesa>({
    table: 'despesas',
    filter: { column: 'data', value: hoje },
    initialQuery: async () => {
      const { data, error } = await supabase.from('despesas').select('*').eq('data', hoje).is('deleted_at', null)
      if (error) throw error
      return data ?? []
    },
  })

  const [aberto, setAberto] = useState<Fechamento[]>([])
  const [atrasadas, setAtrasadas] = useState<PromissoriaAberta[]>([])

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('fechamentos_caixa').select('*')
        .lt('data', hoje).neq('status', 'fechado')
        .order('data', { ascending: false }).limit(5)
      setAberto((data ?? []) as Fechamento[])
    })()
    void (async () => {
      const { data } = await supabase
        .from('vw_promissorias_em_aberto').select('*').eq('atrasada', true)
        .order('vencimento', { ascending: true }).limit(10)
      setAtrasadas((data ?? []) as PromissoriaAberta[])
    })()
  }, [hoje])

  const totalVendas = vendas.rows.reduce((s, v) => s + v.valor_total, 0)
  const totalRecebimentos = recebimentos.rows.reduce((s, r) => s + r.valor, 0)
  const totalDespesas = despesas.rows.reduce((s, d) => s + d.valor, 0)
  const liquido = totalVendas - totalDespesas
  const promissoriaHoje = vendas.rows.filter(v => v.forma_pagamento === 'promissoria').reduce((s, v) => s + v.valor_total, 0)
  const receitaRealHoje = totalVendas - promissoriaHoje

  const porForma = (forma: string, src: { valor_total?: number; valor?: number; forma_pagamento: string }[]) =>
    src.filter(x => x.forma_pagamento === forma).reduce((s, x) => s + (x.valor_total ?? x.valor ?? 0), 0)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        <BlurText text={`Dashboard — ${hoje}`} />
      </h1>
      <p className="text-sm text-muted-foreground">Atualização ao vivo via Realtime.</p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-4 gap-4"
      >
        <Kpi label="Receita Bruta" valor={totalVendas} />
        <Kpi label="Receita Real Hoje" valor={receitaRealHoje} subtitle="exclui promissórias geradas" highlight />
        <Kpi label="Recebimentos Promissória" valor={totalRecebimentos} subtitle="quita dívidas anteriores" />
        <Kpi label="Despesas" valor={totalDespesas} negativo />
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Vendas por forma</h3>
          <Linha label="Dinheiro" valor={porForma('dinheiro', vendas.rows)} />
          <Linha label="Pix" valor={porForma('pix', vendas.rows)} />
          <Linha label="Débito" valor={porForma('debito', vendas.rows)} />
          <Linha label="Crédito" valor={porForma('credito', vendas.rows)} />
          <Linha label="Promissória" valor={promissoriaHoje} muted />
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Recebimentos por forma</h3>
          <Linha label="Dinheiro" valor={porForma('dinheiro', recebimentos.rows)} />
          <Linha label="Pix" valor={porForma('pix', recebimentos.rows)} />
          <Linha label="Débito" valor={porForma('debito', recebimentos.rows)} />
          <Linha label="Crédito" valor={porForma('credito', recebimentos.rows)} />
          <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            Total: <span className="font-mono">{centsToBRL(totalRecebimentos)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Caixas não fechados (dias anteriores)
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {aberto.length}
            </span>
          </div>
          {aberto.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Tudo em dia.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {aberto.map(a => (
                <li key={a.id} className="py-1.5">
                  {a.data} — operador {a.operador_id.substring(0, 8)} — status: {a.status}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Promissórias atrasadas
            </h3>
            <Link to="/admin/promissorias" className="text-xs text-primary underline">Ver todas</Link>
          </div>
          {atrasadas.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sem atrasos.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {atrasadas.map(p => (
                <li key={p.id ?? ''} className="py-1.5">
                  <div className="flex items-center justify-between">
                    <span>{p.cliente_nome}</span>
                    <span className="font-mono text-destructive">{centsToBRL(p.saldo ?? 0)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Venc: {p.vencimento}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <p className="text-sm">
          <strong>Líquido do dia (Vendas − Despesas):</strong>{' '}
          <span className="font-mono">{centsToBRL(liquido)}</span>
        </p>
      </div>
    </div>
  )
}

function Kpi({ label, valor, subtitle, highlight, negativo }: { label: string; valor: number; subtitle?: string; highlight?: boolean; negativo?: boolean }) {
  const tilt = useTilt3d(7)
  return (
    <motion.div variants={staggerItem}>
      <SpotlightCard
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        style={tilt.style}
        className={cn(
          'rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md',
          highlight ? 'border-accent/50 bg-accent/10' : 'bg-card',
        )}
      >
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className={cn('mt-1 font-mono text-2xl font-bold', negativo && valor > 0 && 'text-destructive')}>
          {negativo && valor > 0 ? '-' : ''}
          <CountUp value={valor} format={centsToBRL} />
        </p>
        {subtitle && <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>}
      </SpotlightCard>
    </motion.div>
  )
}

function Linha({ label, valor, muted }: { label: string; valor: number; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{centsToBRL(valor)}</span>
    </div>
  )
}
