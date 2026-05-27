import { useEffect, useMemo, useState } from 'react'
import { centsToBRL } from '@/lib/money'
import { hojeBelem, formatTimeBelem } from '@/lib/date'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useCaixaStore, type Venda, type Recebimento, type Despesa } from '@/stores/caixa'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { ModalVenda } from './ModalVenda'
import { ModalPromissoria } from './ModalPromissoria'
import { ModalReceberPromissoria } from './ModalReceberPromissoria'
import { ModalDespesa } from './ModalDespesa'
import { ModalFechamento } from './ModalFechamento'
import { cn } from '@/lib/utils'

type FormaDireta = 'dinheiro' | 'pix' | 'debito' | 'credito'
type ModalAberto = 'venda' | 'promissoria' | 'receber' | 'despesa' | 'fechamento' | null

export default function Caixa() {
  const { user, profile } = useAuthStore()
  const hoje = useMemo(() => hojeBelem(), [])
  const [modal, setModal] = useState<ModalAberto>(null)
  const [formaVenda, setFormaVenda] = useState<FormaDireta | null>(null)

  const vendasQuery = useRealtimeTable<Venda>({
    table: 'vendas',
    filter: { column: 'data', value: hoje },
    initialQuery: async () => {
      const { data, error } = await supabase
        .from('vendas').select('*').eq('data', hoje).is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    orderKey: 'created_at',
    orderDesc: true,
  })

  const recebimentosQuery = useRealtimeTable<Recebimento>({
    table: 'recebimentos_promissoria',
    filter: { column: 'data', value: hoje },
    initialQuery: async () => {
      const { data, error } = await supabase
        .from('recebimentos_promissoria').select('*').eq('data', hoje)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    orderKey: 'created_at',
    orderDesc: true,
  })

  const despesasQuery = useRealtimeTable<Despesa>({
    table: 'despesas',
    filter: { column: 'data', value: hoje },
    initialQuery: async () => {
      const { data, error } = await supabase
        .from('despesas').select('*').eq('data', hoje).is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    orderKey: 'created_at',
    orderDesc: true,
  })

  const {
    setVendas, setRecebimentos, setDespesas,
    totaisVendas, totaisRecebimentos, totalDespesas,
    setFechado, fechado,
  } = useCaixaStore()

  useEffect(() => { setVendas(vendasQuery.rows) }, [vendasQuery.rows, setVendas])
  useEffect(() => { setRecebimentos(recebimentosQuery.rows) }, [recebimentosQuery.rows, setRecebimentos])
  useEffect(() => { setDespesas(despesasQuery.rows) }, [despesasQuery.rows, setDespesas])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await supabase
        .from('fechamentos_caixa').select('status')
        .eq('data', hoje).eq('operador_id', user.id).maybeSingle()
      if (data?.status === 'fechado') setFechado(true)
    })()
  }, [user, hoje, setFechado])

  function openVenda(f: FormaDireta) { setFormaVenda(f); setModal('venda') }

  useKeyboardShortcut(
    {
      F1: () => openVenda('dinheiro'),
      F2: () => openVenda('pix'),
      F3: () => openVenda('debito'),
      F4: () => openVenda('credito'),
      F5: () => setModal('promissoria'),
      F8: () => setModal('despesa'),
      F9: () => setModal('receber'),
      F12: () => setModal('fechamento'),
    },
    { enabled: !fechado && modal === null },
  )

  const linhas = mergeLinhas(vendasQuery.rows, recebimentosQuery.rows, despesasQuery.rows)
  const totalDia = totaisVendas.dinheiro + totaisVendas.pix + totaisVendas.debito + totaisVendas.credito

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-xl font-bold">Caixa — {hoje}</h1>
          <p className="text-xs text-muted-foreground">
            Operador: {profile?.nome} ({profile?.role})
          </p>
        </div>
        {fechado ? (
          <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            CAIXA FECHADO
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
            CAIXA ABERTO
          </span>
        )}
      </header>

      <div className="grid flex-1 grid-cols-[1fr_320px] overflow-hidden">
        <section className="flex flex-col overflow-hidden border-r">
          <div className="px-6 py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Atalhos</p>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {(['dinheiro', 'pix', 'debito', 'credito'] as FormaDireta[]).map((f, i) => (
                <button
                  key={f}
                  onClick={() => openVenda(f)}
                  disabled={fechado}
                  className="flex h-20 flex-col items-center justify-center rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <kbd className="mb-1">F{i + 1}</kbd>
                  <span className="capitalize">{f}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <button onClick={() => setModal('promissoria')} disabled={fechado} className="flex h-14 flex-col items-center justify-center rounded-lg border bg-amber-50 text-xs font-medium hover:bg-amber-100 disabled:opacity-50">
                <kbd>F5</kbd><span>Promissória</span>
              </button>
              <button onClick={() => setModal('despesa')} disabled={fechado} className="flex h-14 flex-col items-center justify-center rounded-lg border bg-red-50 text-xs font-medium hover:bg-red-100 disabled:opacity-50">
                <kbd>F8</kbd><span>Despesa</span>
              </button>
              <button onClick={() => setModal('receber')} disabled={fechado} className="flex h-14 flex-col items-center justify-center rounded-lg border bg-teal-50 text-xs font-medium hover:bg-teal-100 disabled:opacity-50">
                <kbd>F9</kbd><span>Receber</span>
              </button>
              <button onClick={() => setModal('fechamento')} disabled={fechado} className="flex h-14 flex-col items-center justify-center rounded-lg border bg-slate-100 text-xs font-medium hover:bg-slate-200 disabled:opacity-50">
                <kbd>F12</kbd><span>Fechar</span>
              </button>
            </div>
          </div>

          <h3 className="border-y bg-muted/40 px-6 py-2 text-sm font-semibold uppercase tracking-wide">
            Lançamentos do dia ({linhas.length})
          </h3>
          <ul className="flex-1 overflow-auto divide-y">
            {vendasQuery.loading && (
              <li className="p-6 text-center text-sm text-muted-foreground">Carregando…</li>
            )}
            {!vendasQuery.loading && linhas.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Sem lançamentos hoje. Pressione F1-F4 pra começar.
              </li>
            )}
            {linhas.map((l) => (
              <li key={l.key} className="flex items-center justify-between px-6 py-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">{formatTimeBelem(l.created_at)}</span>
                  <span className={cn('ml-3 rounded px-2 py-0.5 text-xs font-bold uppercase', l.tagClass)}>
                    {l.tag}
                  </span>
                  {l.obs && <span className="ml-2 text-xs text-muted-foreground">— {l.obs}</span>}
                </div>
                <div className={cn('font-mono font-semibold', l.tag === 'DESPESA' && 'text-destructive')}>
                  {l.tag === 'DESPESA' ? '-' : ''}{centsToBRL(l.valor)}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col overflow-auto bg-muted/20">
          <div className="border-b px-5 py-3">
            <p className="text-xs uppercase text-muted-foreground">Receita do dia</p>
            <p className="mt-1 text-2xl font-bold">{centsToBRL(totalDia)}</p>
          </div>
          <CardTotal label="Dinheiro" hint="F1" valor={totaisVendas.dinheiro} />
          <CardTotal label="Pix" hint="F2" valor={totaisVendas.pix} />
          <CardTotal label="Débito" hint="F3" valor={totaisVendas.debito} />
          <CardTotal label="Crédito" hint="F4" valor={totaisVendas.credito} />
          <CardTotal label="Promissória" hint="F5" valor={totaisVendas.promissoria} subtitle="(vira dívida)" />
          <CardTotal
            label="Recebimentos"
            hint="F9"
            valor={totaisRecebimentos.dinheiro + totaisRecebimentos.pix + totaisRecebimentos.debito + totaisRecebimentos.credito}
            subtitle="(quita dívida, não é receita nova)"
          />
          <CardTotal label="Despesas" hint="F8" valor={totalDespesas} negativo />
          <div className="mt-auto border-t px-5 py-3 text-xs text-muted-foreground">
            <p>F12 — Fechar caixa do dia</p>
          </div>
        </aside>
      </div>

      <ModalVenda forma={modal === 'venda' ? formaVenda : null} onClose={() => { setModal(null); setFormaVenda(null) }} />
      <ModalPromissoria open={modal === 'promissoria'} onClose={() => setModal(null)} />
      <ModalReceberPromissoria open={modal === 'receber'} onClose={() => setModal(null)} />
      <ModalDespesa open={modal === 'despesa'} onClose={() => setModal(null)} />
      <ModalFechamento open={modal === 'fechamento'} onClose={() => setModal(null)} onFechado={() => setFechado(true)} />
    </div>
  )
}

interface CardProps { label: string; hint: string; valor: number; subtitle?: string; negativo?: boolean }
function CardTotal({ label, hint, valor, subtitle, negativo }: CardProps) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-3">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        <kbd className="mt-1 inline-block">{hint}</kbd>
      </div>
      <p className={cn('font-mono text-base font-semibold', negativo && valor > 0 && 'text-destructive')}>
        {negativo && valor > 0 ? '-' : ''}{centsToBRL(valor)}
      </p>
    </div>
  )
}

type Linha = { key: string; tag: string; tagClass: string; valor: number; created_at: string; obs?: string | null }
function mergeLinhas(v: Venda[], r: Recebimento[], d: Despesa[]): Linha[] {
  const tagClassFor = (forma: string) => ({
    dinheiro: 'bg-emerald-100 text-emerald-700',
    pix: 'bg-blue-100 text-blue-700',
    debito: 'bg-purple-100 text-purple-700',
    credito: 'bg-orange-100 text-orange-700',
    promissoria: 'bg-amber-100 text-amber-800',
  }[forma] ?? 'bg-muted text-muted-foreground')

  const items: Linha[] = [
    ...v.map((x) => ({
      key: 'v_' + x.id,
      tag: x.forma_pagamento.toUpperCase(),
      tagClass: tagClassFor(x.forma_pagamento),
      valor: x.valor_total,
      created_at: x.created_at,
      obs: x.observacao,
    })),
    ...r.map((x) => ({
      key: 'r_' + x.id,
      tag: `RECEB. ${x.forma_pagamento.toUpperCase()}`,
      tagClass: 'bg-teal-100 text-teal-700',
      valor: x.valor,
      created_at: x.created_at,
      obs: 'Promissória',
    })),
    ...d.map((x) => ({
      key: 'd_' + x.id,
      tag: 'DESPESA',
      tagClass: 'bg-red-100 text-red-700',
      valor: x.valor,
      created_at: x.created_at,
      obs: x.descricao,
    })),
  ]
  return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}
