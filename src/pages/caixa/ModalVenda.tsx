import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, MoneyError } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { MoneyInput } from '@/components/shared/MoneyInput'
import type { Database } from '@/types/database'

type FormaDireta = 'dinheiro' | 'pix' | 'debito' | 'credito'

interface Props {
  forma: FormaDireta | null
  onClose: () => void
}

const LABELS: Record<FormaDireta, string> = {
  dinheiro: 'Dinheiro (F1)',
  pix: 'Pix (F2)',
  debito: 'Débito (F3)',
  credito: 'Crédito (F4)',
}

export function ModalVenda({ forma, onClose }: Props) {
  const { user } = useAuthStore()
  const [raw, setRaw] = useState('')
  const [obs, setObs] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (forma) {
      setRaw('')
      setObs('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [forma])

  async function submit() {
    if (!forma || !user) return
    let cents: number
    try {
      cents = parseUserInput(raw)
    } catch (e) {
      const msg = e instanceof MoneyError ? e.message : 'Valor inválido'
      toast.error(msg)
      return
    }

    setSubmitting(true)
    const payload: Database['public']['Tables']['vendas']['Insert'] = {
      valor_total: cents,
      forma_pagamento: forma,
      operador_id: user.id,
      observacao: obs.trim() ? obs.trim() : null,
    }
    const { error } = await supabase.from('vendas').insert(payload)
    setSubmitting(false)

    if (error) {
      if (error.code === '55000' || /fechado/i.test(error.message)) {
        toast.error('Caixa fechado, fale com o ADM')
      } else {
        toast.error('Falha ao registrar', { description: error.message })
      }
      return
    }
    toast.success(`${LABELS[forma].split(' ')[0]} ${centsToBRL(cents)}`)
    onClose()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!forma) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold">Venda — {LABELS[forma]}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Digite o valor e pressione ENTER. ESC cancela.
        </p>
        <label className="mb-1 block text-sm font-medium">Valor</label>
        <MoneyInput
          ref={inputRef}
          data-allow-shortcuts="false"
          onValueChange={setRaw}
          onKeyDown={onKey}
          disabled={submitting}
        />
        <label className="mb-1 mt-4 block text-sm font-medium">Observação (opcional)</label>
        <input
          type="text"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onKeyDown={onKey}
          maxLength={200}
          disabled={submitting}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            ESC — Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !raw}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Salvando…' : 'ENTER — Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
