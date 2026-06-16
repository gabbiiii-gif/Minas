import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, centsToDecimal, MoneyError } from '@/lib/money'
import {
  rpcReceberPromissoriasLote,
  listarPromissoriasAbertasDoCliente,
  type PromissoriaAberta,
  type ItemRecebimentoLote,
} from '@/lib/rpc'
import { ClienteCombobox } from '@/components/shared/ClienteCombobox'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { ModalShell } from '@/components/shared/ModalShell'
import { hojeBelem } from '@/lib/date'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

interface Cliente { id: string; nome: string; telefone: string | null }
interface Props { open: boolean; onClose: () => void; defaultDate?: string }

type Forma = 'dinheiro' | 'pix' | 'debito' | 'credito'

/** Lê valor monetário opcional; vazio = 0. Lança MoneyError em formato inválido. */
function parseOpcional(raw: string): number {
  if (!raw.trim()) return 0
  return parseUserInput(raw)
}

export function ModalReceberPromissoria({ open, onClose, defaultDate }: Props) {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const hojeStr = hojeBelem()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [promissorias, setPromissorias] = useState<PromissoriaAberta[]>([])
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  // Modo nota única: valor recebido (caixa) + desconto editáveis
  const [valorRaw, setValorRaw] = useState('')
  const [descontoRaw, setDescontoRaw] = useState('')
  const [forma, setForma] = useState<Forma>('dinheiro')
  const [dataLanc, setDataLanc] = useState(defaultDate ?? hojeStr)
  const [submitting, setSubmitting] = useState(false)
  const valorRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setCliente(null); setPromissorias([]); setSelecionadas([])
      setValorRaw(''); setDescontoRaw(''); setForma('dinheiro')
      setDataLanc(defaultDate ?? hojeStr)
    }
  }, [open, hojeStr, defaultDate])

  useEffect(() => {
    if (!cliente) { setPromissorias([]); setSelecionadas([]); return }
    void listarPromissoriasAbertasDoCliente(cliente.id).then(setPromissorias)
  }, [cliente])

  const notasSelecionadas = useMemo(
    () => promissorias.filter((p) => p.id && selecionadas.includes(p.id)),
    [promissorias, selecionadas],
  )
  const totalSaldo = notasSelecionadas.reduce((s, p) => s + (p.saldo ?? 0), 0)
  const umaNota = notasSelecionadas.length === 1
  const varias = notasSelecionadas.length >= 2

  // Ao selecionar exatamente uma nota, pré-preenche valor com o saldo cheio.
  useEffect(() => {
    if (umaNota) {
      const s = notasSelecionadas[0].saldo ?? 0
      setValorRaw(centsToDecimal(s))
      setDescontoRaw('')
      setTimeout(() => valorRef.current?.focus(), 30)
    } else {
      setValorRaw(''); setDescontoRaw('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionadas.join(','), umaNota])

  function toggle(id: string) {
    setSelecionadas((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  // ===== Cálculo do que será lançado =====
  // Nota única: valor + desconto digitados.
  // Várias: paga cada nota cheia; desconto global rateado entre elas.
  const descontoMultiCents = (() => {
    if (!varias) return 0
    try { return parseOpcional(descontoRaw) } catch { return 0 }
  })()
  const valorReceberMulti = totalSaldo - descontoMultiCents

  function montarItens(): ItemRecebimentoLote[] {
    if (umaNota) {
      const note = notasSelecionadas[0]
      const valor = parseUserInput(valorRaw)
      const desconto = parseOpcional(descontoRaw)
      const saldo = note.saldo ?? 0
      if (valor + desconto > saldo) {
        throw new MoneyError('Valor + desconto excede o saldo da nota')
      }
      return [{ promissoria_id: note.id!, valor, desconto }]
    }
    // Várias: rateia o desconto, garantindo valor >= 1 centavo por nota.
    let restante = descontoMultiCents
    return notasSelecionadas.map((p) => {
      const saldo = p.saldo ?? 0
      const desc = Math.min(restante, Math.max(0, saldo - 1))
      restante -= desc
      return { promissoria_id: p.id!, valor: saldo - desc, desconto: desc }
    })
  }

  async function submit() {
    if (notasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma promissória')
      return
    }
    let itens: ItemRecebimentoLote[]
    try {
      itens = montarItens()
    } catch (e) {
      toast.error(e instanceof MoneyError ? e.message : 'Valor inválido')
      return
    }
    if (varias && valorReceberMulti <= 0) {
      toast.error('Desconto não pode zerar o valor a receber')
      return
    }
    if (itens.some((i) => i.valor <= 0)) {
      toast.error('Valor a receber deve ser maior que zero')
      return
    }

    const totalValor = itens.reduce((s, i) => s + i.valor, 0)
    const totalDesc = itens.reduce((s, i) => s + i.desconto, 0)

    setSubmitting(true)
    const { error } = await rpcReceberPromissoriasLote({
      itens,
      forma,
      ...(isAdmin && dataLanc && dataLanc !== hojeStr ? { data: dataLanc } : {}),
    })
    setSubmitting(false)
    if (error) {
      toast.error('Falha ao registrar recebimento', { description: error })
      return
    }
    const qtd = itens.length
    toast.success(
      `Recebido ${centsToBRL(totalValor)} em ${forma}` +
        (qtd > 1 ? ` — ${qtd} notas baixadas` : '') +
        (totalDesc > 0 ? ` (desconto ${centsToBRL(totalDesc)})` : ''),
    )
    void window.api?.printer.printRecibo({
      cliente: cliente?.nome,
      valor: totalValor,
      forma,
      data: new Date().toISOString(),
      saldo_apos: totalSaldo - totalValor - totalDesc,
    }).then((r) => {
      if (r?.ok) toast.message('Recibo enviado à impressora')
    })
    onClose()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <ModalShell open={open} onClose={onClose} className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-2xl p-6">
        <div className="mb-3 h-1 w-10 rounded-full bg-accent" />
        <h2 className="mb-1 text-xl font-bold">Receber Promissória (F9)</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Marque uma ou várias notas. Recebimento NÃO conta como receita nova.
        </p>

        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <ClienteCombobox value={cliente} onChange={setCliente} autoFocus />

        {cliente && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">
              Promissórias em aberto ({promissorias.length})
              {selecionadas.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {selecionadas.length} selecionada{selecionadas.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            {promissorias.length === 0 ? (
              <p className="rounded border p-3 text-sm text-muted-foreground">
                Nenhuma promissória em aberto pra este cliente.
              </p>
            ) : (
              <ul className="max-h-40 overflow-auto rounded border divide-y">
                {promissorias.map((p) => {
                  const marcada = p.id ? selecionadas.includes(p.id) : false
                  return (
                    <li
                      key={p.id ?? ''}
                      onClick={() => p.id && toggle(p.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted',
                        marcada && 'bg-primary/10',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        readOnly
                        tabIndex={-1}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span>
                          Saldo {centsToBRL(p.saldo ?? 0)} de {centsToBRL(p.valor_original ?? 0)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {p.vencimento ? `Venc ${p.vencimento}` : 'sem venc.'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {umaNota && (
          <>
            <label className="mb-1 mt-4 block text-sm font-medium">Valor a receber</label>
            <input
              ref={valorRef}
              inputMode="decimal"
              value={valorRaw}
              onChange={(e) => setValorRaw(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={onKey}
              disabled={submitting}
              placeholder="0,00"
              className="h-14 w-full rounded-md border bg-background px-4 text-2xl font-bold tracking-wide outline-none ring-ring focus-visible:ring-2"
            />

            <label className="mb-1 mt-4 block text-sm font-medium">
              Desconto / abatimento <span className="text-xs text-muted-foreground">(opcional)</span>
            </label>
            <input
              inputMode="decimal"
              value={descontoRaw}
              onChange={(e) => setDescontoRaw(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={onKey}
              disabled={submitting}
              placeholder="0,00"
              className="h-11 w-full rounded-md border bg-background px-4 text-lg font-bold tracking-wide outline-none ring-ring focus-visible:ring-2"
            />
            <ResumoUma
              saldo={notasSelecionadas[0].saldo ?? 0}
              valorRaw={valorRaw}
              descontoRaw={descontoRaw}
            />
          </>
        )}

        {varias && (
          <div className="mt-4 rounded border bg-muted/30 p-3">
            <label className="mb-1 block text-sm font-medium">
              Desconto / abatimento total <span className="text-xs text-muted-foreground">(opcional)</span>
            </label>
            <MoneyInput onValueChange={setDescontoRaw} onKeyDown={onKey} disabled={submitting} className="h-11 text-lg" />
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Soma dos saldos ({notasSelecionadas.length} notas)</span>
                <span className="font-mono">{centsToBRL(totalSaldo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span className="font-mono">- {centsToBRL(descontoMultiCents)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Valor a receber</span>
                <span className={cn('font-mono', valorReceberMulti <= 0 && 'text-destructive')}>
                  {centsToBRL(valorReceberMulti)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Todas as notas marcadas serão quitadas.</p>
            </div>
          </div>
        )}

        {notasSelecionadas.length > 0 && (
          <>
            <label className="mb-1 mt-4 block text-sm font-medium">Forma de pagamento</label>
            <div className="grid grid-cols-4 gap-2">
              {(['dinheiro', 'pix', 'debito', 'credito'] as Forma[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForma(f)}
                  className={cn(
                    'rounded border px-2 py-2 text-sm capitalize hover:bg-muted',
                    forma === f && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {isAdmin && (
              <>
                <label className="mb-1 mt-4 block text-sm font-medium">
                  Data do lançamento{' '}
                  {dataLanc !== hojeStr && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                      retroativo
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={dataLanc}
                  onChange={(e) => setDataLanc(e.target.value)}
                  onKeyDown={onKey}
                  disabled={submitting}
                  max={hojeStr}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Só admin. Caixa do dia precisa estar aberto/reaberto.
                </p>
              </>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            ESC — Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || notasSelecionadas.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Salvando…' : 'ENTER — Receber'}
          </button>
        </div>
    </ModalShell>
  )
}

/** Resumo ao vivo do modo nota única: liquidado e saldo restante. */
function ResumoUma({ saldo, valorRaw, descontoRaw }: { saldo: number; valorRaw: string; descontoRaw: string }) {
  let valor = 0, desc = 0, erro = false
  try { valor = valorRaw.trim() ? parseUserInput(valorRaw) : 0 } catch { erro = true }
  try { desc = descontoRaw.trim() ? parseUserInput(descontoRaw) : 0 } catch { erro = true }
  const liquidado = valor + desc
  const restante = saldo - liquidado
  return (
    <div className="mt-3 space-y-1 rounded border bg-muted/30 p-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Saldo da nota</span>
        <span className="font-mono">{centsToBRL(saldo)}</span>
      </div>
      <div className="flex justify-between border-t pt-1">
        <span className="text-muted-foreground">Saldo restante após baixa</span>
        <span className={cn('font-mono font-semibold', !erro && restante === 0 && 'text-emerald-600', restante < 0 && 'text-destructive')}>
          {erro ? '—' : restante === 0 ? 'QUITADA' : centsToBRL(restante)}
        </span>
      </div>
    </div>
  )
}
