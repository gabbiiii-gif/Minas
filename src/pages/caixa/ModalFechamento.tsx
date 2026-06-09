import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { parseUserInput, centsToBRL } from '@/lib/money'
import { rpcFecharCaixa } from '@/lib/rpc'
import { useCaixaStore } from '@/stores/caixa'
import { hojeBelem } from '@/lib/date'
import { cn } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void; onFechado: () => void; data?: string }
type Campo = 'dinheiro' | 'pix' | 'debito' | 'credito'

type Totais = Record<Campo, number>
const ZERO: Totais = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
const ZERO_RAW: Record<Campo, string> = { dinheiro: '', pix: '', debito: '', credito: '' }
const CAMPOS: Campo[] = ['dinheiro', 'pix', 'debito', 'credito']

/** Lê texto monetário. Vazio = 0. Inválido (ex.: "640," durante digitação) = null. */
function tryCents(raw: string): number | null {
  if (!raw.trim()) return 0
  try { return parseUserInput(raw) } catch { return null }
}

export function ModalFechamento({ open, onClose, onFechado, data }: Props) {
  const { totaisVendas, totaisRecebimentos, totalDespesas } = useCaixaStore()
  // Guarda TEXTO cru por campo; só converte pra centavos no submit.
  // Assim digitar vírgula/ponto/centavos nunca quebra a tela.
  const [fisicoRaw, setFisicoRaw] = useState<Record<Campo, string>>(ZERO_RAW)
  const [submitting, setSubmitting] = useState(false)
  const [obs, setObs] = useState('')
  const dataFechamento = data ?? hojeBelem()

  const sistema: Totais = {
    dinheiro: totaisVendas.dinheiro + totaisRecebimentos.dinheiro - totalDespesas,
    pix: totaisVendas.pix + totaisRecebimentos.pix,
    debito: totaisVendas.debito + totaisRecebimentos.debito,
    credito: totaisVendas.credito + totaisRecebimentos.credito,
  }

  useEffect(() => {
    if (open) { setFisicoRaw(ZERO_RAW); setObs('') }
  }, [open])

  // Centavos por campo (0 quando vazio/inválido — só pra exibir diferença ao vivo).
  const fisico: Totais = {
    dinheiro: tryCents(fisicoRaw.dinheiro) ?? 0,
    pix: tryCents(fisicoRaw.pix) ?? 0,
    debito: tryCents(fisicoRaw.debito) ?? 0,
    credito: tryCents(fisicoRaw.credito) ?? 0,
  }
  const algumInvalido = CAMPOS.some((c) => tryCents(fisicoRaw[c]) === null)

  const diffDinheiro = fisico.dinheiro - sistema.dinheiro
  const diffTotal =
    (fisico.dinheiro + fisico.pix + fisico.debito + fisico.credito) -
    (sistema.dinheiro + sistema.pix + sistema.debito + sistema.credito)

  const temDiferenca = CAMPOS.some((k) => fisico[k] !== sistema[k])

  async function submit() {
    if (algumInvalido) {
      toast.error('Há valor inválido — confira os campos (use vírgula para centavos)')
      return
    }
    if (temDiferenca && !obs.trim()) {
      toast.error('Há diferença — preencha a observação')
      return
    }
    setSubmitting(true)
    const { error } = await rpcFecharCaixa({ data: dataFechamento, caderno: ZERO, fisico })
    setSubmitting(false)
    if (error) {
      toast.error('Falha ao fechar', { description: error })
      return
    }
    toast.success('Caixa fechado com sucesso')
    onFechado()
    onClose()
  }

  function setVal(campo: Campo) {
    return (val: string) => setFisicoRaw((c) => ({ ...c, [campo]: val }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl rounded-lg border bg-card p-6 shadow-2xl">
        <h2 className="mb-1 text-xl font-bold">Fechamento de Caixa (F12)</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Fechando <span className="font-mono font-semibold">{dataFechamento}</span>. Confira: o que o
          SISTEMA somou × o que você tem em mãos (FÍSICO). Diferença ≠ 0 exige observação.
        </p>

        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="font-semibold text-muted-foreground">Forma</div>
          <div className="font-semibold text-center">SISTEMA</div>
          <div className="font-semibold text-center">FÍSICO</div>
          <div className="font-semibold text-center">Diferença</div>

          {CAMPOS.map((c) => {
            const valido = tryCents(fisicoRaw[c]) !== null
            const diff = fisico[c] - sistema[c]
            return (
              <div key={c} className="contents">
                <div className="self-center capitalize">{c}</div>
                <div className="self-center text-right font-mono">{centsToBRL(sistema[c])}</div>
                <input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={fisicoRaw[c]}
                  onChange={(e) => setVal(c)(e.target.value.replace(/[^\d.,]/g, ''))}
                  className={cn(
                    'rounded border bg-background px-2 py-1 text-right font-mono outline-none ring-ring focus-visible:ring-2',
                    !valido && 'border-destructive ring-destructive',
                  )}
                />
                <div className={cn(
                  'self-center text-right font-mono',
                  valido && diff !== 0 && 'text-destructive font-bold',
                )}>
                  {!valido ? '…' : diff === 0 ? '✓ 0' : centsToBRL(diff)}
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
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Diferença só no dinheiro:</span>
            <span className="font-mono">{centsToBRL(diffDinheiro)}</span>
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
            disabled={submitting || algumInvalido || (temDiferenca && !obs.trim())}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Fechando…' : 'Fechar caixa'}
          </button>
        </div>
      </div>
    </div>
  )
}
