import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, MoneyError } from '@/lib/money'
import { rpcCriarVendaComPromissoria } from '@/lib/rpc'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { ClienteCombobox } from '@/components/shared/ClienteCombobox'
import { hojeBelem } from '@/lib/date'
import { useAuthStore } from '@/stores/auth'

interface Cliente { id: string; nome: string; telefone: string | null }
interface Props { open: boolean; onClose: () => void; defaultDate?: string }

export function ModalPromissoria({ open, onClose, defaultDate }: Props) {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const hojeStr = hojeBelem()
  const [raw, setRaw] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [vencimento, setVencimento] = useState('')
  const [obs, setObs] = useState('')
  const [dataLanc, setDataLanc] = useState(defaultDate ?? hojeStr)
  const [submitting, setSubmitting] = useState(false)
  const valorRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setRaw(''); setCliente(null); setVencimento(''); setObs('')
      setDataLanc(defaultDate ?? hojeStr)
    }
  }, [open, hojeStr, defaultDate])

  async function submit() {
    if (!cliente) {
      toast.error('Selecione um cliente')
      return
    }
    let cents: number
    try { cents = parseUserInput(raw) } catch (e) {
      toast.error(e instanceof MoneyError ? e.message : 'Valor inválido')
      return
    }

    setSubmitting(true)
    const { error } = await rpcCriarVendaComPromissoria({
      valor: cents,
      cliente_id: cliente.id,
      vencimento: vencimento || null,
      observacao: obs.trim() || null,
      ...(isAdmin && dataLanc !== hojeStr ? { data: dataLanc } : {}),
    })
    setSubmitting(false)
    if (error) {
      toast.error('Falha ao criar promissória', { description: error })
      return
    }
    toast.success(`Promissória ${centsToBRL(cents)} criada para ${cliente.nome}`)
    void window.api?.printer.printPromissoria({
      cliente: cliente.nome,
      telefone: cliente.telefone,
      valor: cents,
      vencimento: vencimento || null,
      data: new Date().toISOString(),
    }).then((r) => {
      if (r?.ok) toast.message('Recibo enviado à impressora')
      else if (r?.error) toast.warning('Impressora indisponível', { description: r.error })
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
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl font-bold">Nova Promissória (F5)</h2>
        <p className="mb-4 text-xs text-muted-foreground">Cliente + valor + vencimento opcional.</p>

        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <ClienteCombobox value={cliente} onChange={setCliente} autoFocus onKeyDown={onKey} />

        <label className="mb-1 mt-4 block text-sm font-medium">Valor</label>
        <MoneyInput ref={valorRef} onValueChange={setRaw} onKeyDown={onKey} disabled={submitting} />

        <label className="mb-1 mt-4 block text-sm font-medium">Vencimento (opcional)</label>
        <input
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
          onKeyDown={onKey}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
        />

        <label className="mb-1 mt-4 block text-sm font-medium">Observação (opcional)</label>
        <input
          type="text"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onKeyDown={onKey}
          maxLength={200}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
        />

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

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            ESC — Cancelar
          </button>
          <button onClick={submit} disabled={submitting || !raw || !cliente} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Salvando…' : 'ENTER — Salvar + Imprimir'}
          </button>
        </div>
      </div>
    </div>
  )
}
