import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, MoneyError } from '@/lib/money'
import { rpcReceberPromissoria, listarPromissoriasAbertasDoCliente, type PromissoriaAberta } from '@/lib/rpc'
import { ClienteCombobox } from '@/components/shared/ClienteCombobox'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

interface Cliente { id: string; nome: string; telefone: string | null }
interface Props { open: boolean; onClose: () => void; defaultDate?: string }

type Forma = 'dinheiro' | 'pix' | 'debito' | 'credito'

export function ModalReceberPromissoria({ open, onClose, defaultDate }: Props) {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const hojeStr = new Date().toISOString().slice(0, 10)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [promissorias, setPromissorias] = useState<PromissoriaAberta[]>([])
  const [selecionada, setSelecionada] = useState<PromissoriaAberta | null>(null)
  const [raw, setRaw] = useState('')
  const [forma, setForma] = useState<Forma>('dinheiro')
  const [dataLanc, setDataLanc] = useState(defaultDate ?? hojeStr)
  const [submitting, setSubmitting] = useState(false)
  const valorRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setCliente(null); setPromissorias([]); setSelecionada(null); setRaw(''); setForma('dinheiro')
      setDataLanc(defaultDate ?? hojeStr)
    }
  }, [open, hojeStr, defaultDate])

  useEffect(() => {
    if (!cliente) { setPromissorias([]); setSelecionada(null); return }
    void listarPromissoriasAbertasDoCliente(cliente.id).then(setPromissorias)
  }, [cliente])

  useEffect(() => {
    if (selecionada && selecionada.saldo != null) {
      const cents = selecionada.saldo
      const reais = Math.floor(cents / 100)
      const cs = String(cents % 100).padStart(2, '0')
      setRaw(`${reais},${cs}`)
      setTimeout(() => valorRef.current?.focus(), 30)
    }
  }, [selecionada])

  async function submit() {
    if (!selecionada || !selecionada.id) {
      toast.error('Selecione uma promissória')
      return
    }
    let cents: number
    try { cents = parseUserInput(raw) } catch (e) {
      toast.error(e instanceof MoneyError ? e.message : 'Valor inválido'); return
    }
    if (selecionada.saldo != null && cents > selecionada.saldo) {
      toast.error('Valor excede saldo devedor')
      return
    }
    setSubmitting(true)
    const { error } = await rpcReceberPromissoria({
      promissoria_id: selecionada.id,
      valor: cents,
      forma,
      ...(isAdmin && dataLanc && dataLanc !== hojeStr ? { data: dataLanc } : {}),
    })
    setSubmitting(false)
    if (error) {
      toast.error('Falha ao registrar recebimento', { description: error })
      return
    }
    toast.success(`Recebido ${centsToBRL(cents)} em ${forma}`)
    void window.api?.printer.printRecibo({
      cliente: cliente?.nome,
      valor: cents,
      forma,
      data: new Date().toISOString(),
      saldo_apos: (selecionada.saldo ?? 0) - cents,
    }).then((r) => {
      if (r?.ok) toast.message('Recibo enviado à impressora')
    })
    onClose()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl font-bold">Receber Promissória (F9)</h2>
        <p className="mb-4 text-xs text-muted-foreground">Recebimento NÃO conta como receita nova.</p>

        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <ClienteCombobox value={cliente} onChange={setCliente} autoFocus />

        {cliente && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">
              Promissórias em aberto ({promissorias.length})
            </label>
            {promissorias.length === 0 ? (
              <p className="rounded border p-3 text-sm text-muted-foreground">
                Nenhuma promissória em aberto pra este cliente.
              </p>
            ) : (
              <ul className="max-h-40 overflow-auto rounded border divide-y">
                {promissorias.map((p) => (
                  <li
                    key={p.id ?? ''}
                    onClick={() => setSelecionada(p)}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm hover:bg-muted',
                      selecionada?.id === p.id && 'bg-primary text-primary-foreground hover:bg-primary',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        Saldo {centsToBRL(p.saldo ?? 0)} de {centsToBRL(p.valor_original ?? 0)}
                      </span>
                      <span className="text-xs">{p.vencimento ? `Venc ${p.vencimento}` : 'sem venc.'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {selecionada && (
          <>
            <label className="mb-1 mt-4 block text-sm font-medium">Valor a receber</label>
            <MoneyInput ref={valorRef} onValueChange={setRaw} onKeyDown={onKey} disabled={submitting} />

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
            disabled={submitting || !selecionada || !raw}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Salvando…' : 'ENTER — Receber'}
          </button>
        </div>
      </div>
    </div>
  )
}
