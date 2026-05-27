import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, MoneyError } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { MoneyInput } from '@/components/shared/MoneyInput'

interface Props { open: boolean; onClose: () => void }

export function ModalDespesa({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const [descricao, setDescricao] = useState('')
  const [raw, setRaw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const descRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) { setDescricao(''); setRaw(''); setTimeout(() => descRef.current?.focus(), 30) }
  }, [open])

  async function submit() {
    if (!user) return
    if (!descricao.trim()) { toast.error('Descrição obrigatória'); return }
    let cents: number
    try { cents = parseUserInput(raw) } catch (e) {
      toast.error(e instanceof MoneyError ? e.message : 'Valor inválido'); return
    }
    setSubmitting(true)
    const { error } = await supabase.from('despesas').insert({
      descricao: descricao.trim(),
      valor: cents,
      operador_id: user.id,
    })
    setSubmitting(false)
    if (error) {
      if (/fechado/i.test(error.message)) toast.error('Caixa fechado')
      else toast.error('Falha', { description: error.message })
      return
    }
    toast.success(`Despesa ${centsToBRL(cents)}`)
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
        <h2 className="mb-1 text-xl font-bold">Despesa (F8)</h2>
        <p className="mb-4 text-xs text-muted-foreground">Saída de caixa do dia.</p>

        <label className="mb-1 block text-sm font-medium">Descrição</label>
        <input
          ref={descRef}
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          onKeyDown={onKey}
          maxLength={200}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
        />

        <label className="mb-1 mt-4 block text-sm font-medium">Valor</label>
        <MoneyInput onValueChange={setRaw} onKeyDown={onKey} disabled={submitting} />

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            ESC — Cancelar
          </button>
          <button onClick={submit} disabled={submitting || !raw || !descricao.trim()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {submitting ? 'Salvando…' : 'ENTER — Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
