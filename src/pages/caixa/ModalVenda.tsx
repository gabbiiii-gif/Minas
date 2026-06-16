import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, MoneyError } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { hojeBelem } from '@/lib/date'
import { useAuthStore } from '@/stores/auth'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { ModalShell } from '@/components/shared/ModalShell'
import type { Database } from '@/types/database'

type FormaDireta = 'dinheiro' | 'pix' | 'debito' | 'credito'

interface Props {
  forma: FormaDireta | null
  onClose: () => void
  defaultDate?: string
}

const LABELS: Record<FormaDireta, string> = {
  dinheiro: 'Dinheiro (F1)',
  pix: 'Pix (F2)',
  debito: 'Débito (F3)',
  credito: 'Crédito (F4)',
}

export function ModalVenda({ forma, onClose, defaultDate }: Props) {
  const { user, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const hojeStr = hojeBelem()
  const [raw, setRaw] = useState('')
  const [obs, setObs] = useState('')
  const [dataLanc, setDataLanc] = useState(defaultDate ?? hojeStr)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (forma) {
      setRaw('')
      setObs('')
      setDataLanc(defaultDate ?? hojeStr)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [forma, hojeStr, defaultDate])

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
      ...(isAdmin && dataLanc && dataLanc !== hojeStr ? { data: dataLanc } : {}),
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

  return (
    <ModalShell open={!!forma} onClose={onClose} className="w-full max-w-md rounded-2xl p-6">
      {forma && (
        <>
        <div className="mb-3 h-1 w-10 rounded-full bg-accent" />
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
        {isAdmin && (
          <>
            <label className="mb-1 mt-4 block text-sm font-medium">
              Data do lançamento {dataLanc !== hojeStr && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">retroativo</span>}
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
        </>
      )}
    </ModalShell>
  )
}
