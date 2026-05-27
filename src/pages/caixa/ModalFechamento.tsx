import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL, MoneyError } from '@/lib/money'
import { rpcFecharCaixa } from '@/lib/rpc'
import { useCaixaStore } from '@/stores/caixa'
import { hojeBelem } from '@/lib/date'
import { cn } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void; onFechado: () => void }
type Campo = 'dinheiro' | 'pix' | 'debito' | 'credito'

type Totais = Record<Campo, number>
const ZERO: Totais = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }

export function ModalFechamento({ open, onClose, onFechado }: Props) {
  const { totaisVendas, totaisRecebimentos, totalDespesas } = useCaixaStore()
  const [caderno, setCaderno] = useState<Totais>(ZERO)
  const [fisico, setFisico] = useState<Totais>(ZERO)
  const [submitting, setSubmitting] = useState(false)
  const [obs, setObs] = useState('')

  // Sistema = vendas + recebimentos − despesas (dinheiro)
  const sistema: Totais = {
    dinheiro: totaisVendas.dinheiro + totaisRecebimentos.dinheiro - totalDespesas,
    pix: totaisVendas.pix + totaisRecebimentos.pix,
    debito: totaisVendas.debito + totaisRecebimentos.debito,
    credito: totaisVendas.credito + totaisRecebimentos.credito,
  }

  useEffect(() => {
    if (open) { setCaderno(ZERO); setFisico(ZERO); setObs('') }
  }, [open])

  const diffDinheiro = fisico.dinheiro - sistema.dinheiro
  const diffTotal =
    (fisico.dinheiro + fisico.pix + fisico.debito + fisico.credito) -
    (sistema.dinheiro + sistema.pix + sistema.debito + sistema.credito)

  const temDiferenca = diffTotal !== 0 || diffDinheiro !== 0 ||
    Object.keys(sistema).some((k) => fisico[k as Campo] !== sistema[k as Campo] || caderno[k as Campo] !== sistema[k as Campo])

  async function submit() {
    if (temDiferenca && !obs.trim()) {
      toast.error('Há diferença — preencha a observação')
      return
    }
    setSubmitting(true)
    const { error } = await rpcFecharCaixa({ data: hojeBelem(), caderno, fisico })
    setSubmitting(false)
    if (error) {
      toast.error('Falha ao fechar', { description: error })
      return
    }
    toast.success('Caixa fechado com sucesso')
    onFechado()
    onClose()
  }

  function setVal(setter: typeof setCaderno, campo: Campo) {
    return (val: string) => {
      try { setter((c) => ({ ...c, [campo]: parseUserInput(val) })) }
      catch (e) {
        if (val === '' || val === '0') setter((c) => ({ ...c, [campo]: 0 }))
        else if (e instanceof MoneyError) { /* ignora durante digitação */ }
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-4xl rounded-lg border bg-card p-6 shadow-2xl">
        <h2 className="mb-1 text-xl font-bold">Fechamento de Caixa (F12)</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Conferência tripla: Sistema × Caderno × Físico. Diferença não-zero exige observação.
        </p>

        <div className="grid grid-cols-5 gap-3 text-sm">
          <div className="font-semibold text-muted-foreground">Forma</div>
          <div className="font-semibold text-center">SISTEMA</div>
          <div className="font-semibold text-center">CADERNO</div>
          <div className="font-semibold text-center">FÍSICO</div>
          <div className="font-semibold text-center">Diferença</div>

          {(['dinheiro', 'pix', 'debito', 'credito'] as Campo[]).map((c) => {
            const diff = fisico[c] - sistema[c]
            return (
              <div key={c} className="contents">
                <div className="self-center capitalize">{c}</div>
                <div className="self-center text-right font-mono">{centsToBRL(sistema[c])}</div>
                <input
                  placeholder="0,00"
                  onChange={(e) => setVal(setCaderno, c)(e.target.value)}
                  className="rounded border bg-background px-2 py-1 text-right font-mono outline-none ring-ring focus-visible:ring-2"
                />
                <input
                  placeholder="0,00"
                  onChange={(e) => setVal(setFisico, c)(e.target.value)}
                  className="rounded border bg-background px-2 py-1 text-right font-mono outline-none ring-ring focus-visible:ring-2"
                />
                <div className={cn(
                  'self-center text-right font-mono',
                  diff !== 0 && 'text-destructive font-bold',
                )}>
                  {diff === 0 ? '✓ 0' : centsToBRL(diff)}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 rounded border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span>Diferença total (físico − sistema):</span>
            <span className={cn('font-mono font-bold', diffTotal !== 0 && 'text-destructive')}>
              {centsToBRL(diffTotal)}
            </span>
          </div>
        </div>

        {temDiferenca && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-destructive">
              Observação obrigatória — explique a divergência
            </label>
            <textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || (temDiferenca && !obs.trim())}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Fechando…' : 'Fechar caixa'}
          </button>
        </div>
      </div>
    </div>
  )
}
