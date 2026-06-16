import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { centsToBRL } from '@/lib/money'
import { hojeBelem, formatTimeBelem } from '@/lib/date'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useCaixaStore, type Venda, type Recebimento, type Despesa } from '@/stores/caixa'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { rpcExcluirVenda, rpcExcluirDespesa, rpcExcluirRecebimento } from '@/lib/rpc'
import { ModalVenda } from './ModalVenda'
import { ModalPromissoria } from './ModalPromissoria'
import { ModalReceberPromissoria } from './ModalReceberPromissoria'
import { ModalDespesa } from './ModalDespesa'
import { ModalFechamento } from './ModalFechamento'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { BlurText } from '@/components/reactbits/BlurText'
import { CountUp } from '@/components/reactbits/CountUp'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { useTilt3d } from '@/lib/motion'

type FormaDireta = 'dinheiro' | 'pix' | 'debito' | 'credito'
type ModalAberto = 'venda' | 'promissoria' | 'receber' | 'despesa' | 'fechamento' | null

const FORMA_BTN: Record<FormaDireta, string> = {
  dinheiro: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  pix: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  debito: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
  credito: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
}

export default function Caixa() {
  const { user, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const hoje = useMemo(() => hojeBelem(), [])
  const [activeDate, setActiveDate] = useState(hoje)
  const [statusActiveDate, setStatusActiveDate] = useState<'aberto' | 'fechado' | null>(null)
  const [modal, setModal] = useState<ModalAberto>(null)
  const [formaVenda, setFormaVenda] = useState<FormaDireta | null>(null)
  const tilt = useTilt3d(10)

  const vendasQuery = useRealtimeTable<Venda>({
    table: 'vendas',
    filter: { column: 'data', value: activeDate },
    initialQuery: async () => {
      const { data, error } = await supabase
        .from('vendas').select('*').eq('data', activeDate).is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    orderKey: 'created_at',
    orderDesc: true,
  })

  const recebimentosQuery = useRealtimeTable<Recebimento>({
    table: 'recebimentos_promissoria',
    filter: { column: 'data', value: activeDate },
    initialQuery: async () => {
      const { data, error } = await supabase
        .from('recebimentos_promissoria').select('*').eq('data', activeDate)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    orderKey: 'created_at',
    orderDesc: true,
  })

  const despesasQuery = useRealtimeTable<Despesa>({
    table: 'despesas',
    filter: { column: 'data', value: activeDate },
    initialQuery: async () => {
      const { data, error } = await supabase
        .from('despesas').select('*').eq('data', activeDate).is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    orderKey: 'created_at',
    orderDesc: true,
  })

  const { setVendas, setRecebimentos, setDespesas, totaisVendas, totaisRecebimentos, totalDespesas } = useCaixaStore()

  useEffect(() => { setVendas(vendasQuery.rows) }, [vendasQuery.rows, setVendas])
  useEffect(() => { setRecebimentos(recebimentosQuery.rows) }, [recebimentosQuery.rows, setRecebimentos])
  useEffect(() => { setDespesas(despesasQuery.rows) }, [despesasQuery.rows, setDespesas])

  useEffect(() => {
    if (!user) return
    setStatusActiveDate(null)
    void (async () => {
      const baseQ = supabase
        .from('fechamentos_caixa')
        .select('status')
        .eq('data', activeDate)
      const finalQ = activeDate === hoje
        ? baseQ.eq('operador_id', user.id)
        : baseQ
      const { data } = await finalQ
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setStatusActiveDate((data?.status as 'aberto' | 'fechado') ?? 'aberto')
    })()
  }, [user, activeDate, hoje])

  const fechado = statusActiveDate === 'fechado'
  const loadingStatus = statusActiveDate === null
  const isPastReaberto = activeDate !== hoje && statusActiveDate === 'aberto'
  const canEdit = !loadingStatus && !fechado
  // Hoje: qualquer operador fecha. Dia passado (reaberto): só admin.
  const canFechar = canEdit && (activeDate === hoje || isAdmin)

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
      F12: () => { if (canFechar) setModal('fechamento') },
    },
    { enabled: canEdit && modal === null },
  )

  const linhas = mergeLinhas(vendasQuery.rows, recebimentosQuery.rows, despesasQuery.rows)
  const totalDia = totaisVendas.dinheiro + totaisVendas.pix + totaisVendas.debito + totaisVendas.credito

  async function excluirLinha(l: Linha) {
    if (fechado) { toast.error('Caixa fechado'); return }
    if (l.tag === 'PROMISSORIA') {
      toast.error('Promissória não pode ser excluída pelo caixa. Fale com o admin.')
      return
    }
    const motivo = prompt(
      `Excluir ${l.tag} de ${centsToBRL(l.valor)}?\n\nMotivo obrigatório (mínimo 5 caracteres):`,
      '',
    )
    if (motivo === null) return
    if (motivo.trim().length < 5) {
      toast.error('Motivo deve ter pelo menos 5 caracteres')
      return
    }
    const [kind, id] = [l.key.slice(0, 1), l.key.slice(2)]
    const call =
      kind === 'v' ? rpcExcluirVenda({ id, motivo: motivo.trim() }) :
      kind === 'r' ? rpcExcluirRecebimento({ id, motivo: motivo.trim() }) :
      kind === 'd' ? rpcExcluirDespesa({ id, motivo: motivo.trim() }) :
      Promise.resolve({ error: 'tipo desconhecido' })
    const { error } = await call
    if (error) {
      toast.error('Falha ao excluir', { description: error })
      return
    }
    toast.success(`${l.tag} excluído`)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold"><BlurText text="Caixa —" /></h1>
            {isAdmin ? (
              <>
                <input
                  type="date"
                  value={activeDate}
                  max={hoje}
                  onChange={(e) => setActiveDate(e.target.value || hoje)}
                  className="rounded border bg-background px-2 py-1 font-mono text-base font-bold outline-none ring-ring focus-visible:ring-2"
                />
                {activeDate !== hoje && (
                  <button
                    onClick={() => setActiveDate(hoje)}
                    className="text-xs text-muted-foreground underline"
                  >
                    hoje
                  </button>
                )}
              </>
            ) : (
              <span className="text-xl font-bold">{hoje}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Operador: {profile?.nome} ({profile?.role})
          </p>
        </div>
        {loadingStatus ? (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">…</span>
        ) : fechado ? (
          <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            CAIXA FECHADO
          </span>
        ) : isPastReaberto ? (
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
            RETROATIVO
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
            CAIXA ABERTO
          </span>
        )}
      </header>

      {isAdmin && activeDate !== hoje && !fechado && (
        <div className="flex items-center gap-2 border-b bg-amber-50 px-6 py-2 text-xs text-amber-900">
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            retroativo
          </span>
          <span>
            Lançando no dia <strong className="font-mono">{activeDate}</strong> (dados do papel).
            Use F1–F9 normalmente e feche com F12 ao terminar. Clique em <em>hoje</em> pra voltar.
          </span>
        </div>
      )}

      <div className="grid flex-1 grid-cols-[1fr_320px] overflow-hidden">
        <section className="flex flex-col overflow-hidden border-r">
          <div className="px-6 py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Atalhos</p>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {(['dinheiro', 'pix', 'debito', 'credito'] as FormaDireta[]).map((f, i) => (
                <button
                  key={f}
                  onClick={() => openVenda(f)}
                  disabled={!canEdit}
                  onPointerMove={canEdit ? tilt.onPointerMove : undefined}
                  onPointerLeave={tilt.onPointerLeave}
                  style={tilt.style}
                  className={cn(
                    'spotlight-card flex h-20 flex-col items-center justify-center rounded-xl border text-sm font-semibold shadow-sm hover:shadow-lg disabled:opacity-50 disabled:shadow-none',
                    FORMA_BTN[f],
                  )}
                >
                  <kbd className="mb-1">F{i + 1}</kbd>
                  <span className="capitalize">{f}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <button onClick={() => setModal('promissoria')} disabled={!canEdit} className="flex h-14 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
                <kbd>F5</kbd><span>Promissória</span>
              </button>
              <button onClick={() => setModal('despesa')} disabled={!canEdit} className="flex h-14 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
                <kbd>F8</kbd><span>Despesa</span>
              </button>
              <button onClick={() => setModal('receber')} disabled={!canEdit} className="flex h-14 flex-col items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-xs font-semibold text-teal-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-100 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
                <kbd>F9</kbd><span>Receber</span>
              </button>
              <button
                onClick={() => setModal('fechamento')}
                disabled={!canFechar}
                title={activeDate !== hoje && !isAdmin ? 'Só admin fecha dia anterior' : undefined}
                className="flex h-14 flex-col items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              >
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
                Sem lançamentos {activeDate === hoje ? 'hoje' : `em ${activeDate}`}.
                {canEdit && ' Pressione F1-F4 pra começar.'}
              </li>
            )}
            {linhas.map((l) => (
              <motion.li
                key={l.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="group flex items-center justify-between px-6 py-2 text-sm hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground">{formatTimeBelem(l.created_at)}</span>
                  <span className={cn('ml-3 rounded px-2 py-0.5 text-xs font-bold uppercase', l.tagClass)}>
                    {l.tag}
                  </span>
                  {l.obs && <span className="ml-2 truncate text-xs text-muted-foreground">— {l.obs}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn('font-mono font-semibold', l.tag === 'DESPESA' && 'text-destructive')}>
                    {l.tag === 'DESPESA' ? '-' : ''}{centsToBRL(l.valor)}
                  </div>
                  {canEdit && l.tag !== 'PROMISSORIA' && (
                    <button
                      onClick={() => excluirLinha(l)}
                      title="Excluir (com motivo)"
                      className="rounded px-2 py-0.5 text-xs text-muted-foreground opacity-0 hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col overflow-auto bg-muted/20">
          <div className="border-b px-5 py-3">
            <p className="text-xs uppercase text-muted-foreground">Receita do dia</p>
            <p className="mt-1 text-2xl font-bold">
              <CountUp value={totalDia} format={centsToBRL} />
            </p>
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

      <ModalVenda
        forma={modal === 'venda' ? formaVenda : null}
        onClose={() => { setModal(null); setFormaVenda(null) }}
        defaultDate={activeDate}
      />
      <ModalPromissoria open={modal === 'promissoria'} onClose={() => setModal(null)} defaultDate={activeDate} />
      <ModalReceberPromissoria open={modal === 'receber'} onClose={() => setModal(null)} defaultDate={activeDate} />
      <ModalDespesa open={modal === 'despesa'} onClose={() => setModal(null)} defaultDate={activeDate} />
      <ModalFechamento
        open={modal === 'fechamento'}
        data={activeDate}
        onClose={() => setModal(null)}
        onFechado={() => setStatusActiveDate('fechado')}
      />
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
        {negativo && valor > 0 ? '-' : ''}
        <CountUp value={valor} format={centsToBRL} />
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
