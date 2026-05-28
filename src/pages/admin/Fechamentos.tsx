import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { centsToBRL } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Fechamento = Database['public']['Tables']['fechamentos_caixa']['Row']
type FechamentoComOperador = Fechamento & { operador_nome?: string | null }

export default function Fechamentos() {
  const { profile } = useAuthStore()
  const [items, setItems] = useState<FechamentoComOperador[]>([])
  const [loading, setLoading] = useState(true)
  const [reabrindo, setReabrindo] = useState<string | null>(null)
  const isAdmin = profile?.role === 'admin'

  async function load() {
    setLoading(true)
    const { data: fech, error } = await supabase
      .from('fechamentos_caixa')
      .select('*')
      .order('data', { ascending: false })
      .limit(60)
    if (error) {
      toast.error('Falha ao carregar', { description: error.message })
      setLoading(false)
      return
    }

    const operadorIds = Array.from(new Set((fech ?? []).map((f) => f.operador_id)))
    let nomesMap: Record<string, string> = {}
    if (operadorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', operadorIds)
      nomesMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]))
    }

    setItems(((fech ?? []) as Fechamento[]).map((f) => ({ ...f, operador_nome: nomesMap[f.operador_id] ?? null })))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function reabrir(f: Fechamento) {
    const motivo = prompt(
      `Reabrir caixa de ${f.data}?\n\nMotivo (obrigatório):`,
      '',
    )
    if (motivo === null) return
    if (motivo.trim().length < 5) {
      toast.error('Motivo deve ter pelo menos 5 caracteres')
      return
    }

    setReabrindo(f.id)
    const novaObs =
      (f.observacao ?? '') +
      `\n[REABERTO ${new Date().toISOString().slice(0, 16)} por ${profile?.nome}]: ${motivo.trim()}`
    const { error } = await supabase
      .from('fechamentos_caixa')
      .update({ status: 'aberto', fechado_em: null, observacao: novaObs })
      .eq('id', f.id)
    setReabrindo(null)
    if (error) {
      toast.error('Falha ao reabrir', { description: error.message })
      return
    }
    toast.success('Caixa reaberto — operador já pode lançar')
    void load()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Fechamentos de Caixa</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Histórico de fechamentos. Admin pode reabrir caixas fechados.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum fechamento ainda.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="py-2">Data</th>
              <th>Operador</th>
              <th>Status</th>
              <th>Total sistema</th>
              <th>Total físico</th>
              <th>Diferença</th>
              <th>Fechado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => {
              const sistema =
                f.total_sistema_dinheiro + f.total_sistema_pix +
                f.total_sistema_debito + f.total_sistema_credito
              const fisico =
                f.total_fisico_dinheiro + f.total_fisico_pix +
                f.total_fisico_debito + f.total_fisico_credito
              return (
                <tr key={f.id} className="border-b align-top">
                  <td className="py-2 font-mono">{f.data}</td>
                  <td>{f.operador_nome ?? f.operador_id.substring(0, 8)}</td>
                  <td>
                    <span className={cn(
                      'rounded px-2 py-0.5 text-xs font-bold uppercase',
                      f.status === 'fechado' && 'bg-destructive text-destructive-foreground',
                      f.status === 'aberto' && 'bg-emerald-500 text-white',
                      f.status === 'conferido' && 'bg-blue-500 text-white',
                    )}>
                      {f.status}
                    </span>
                  </td>
                  <td className="font-mono">{centsToBRL(sistema)}</td>
                  <td className="font-mono">{centsToBRL(fisico)}</td>
                  <td className={cn(
                    'font-mono',
                    f.diferenca_total !== 0 && 'text-destructive font-bold',
                  )}>
                    {centsToBRL(f.diferenca_total)}
                  </td>
                  <td className="text-xs">{f.fechado_em?.slice(0, 16) ?? '—'}</td>
                  <td>
                    {isAdmin && f.status === 'fechado' && (
                      <button
                        onClick={() => reabrir(f)}
                        disabled={reabrindo === f.id}
                        className="rounded border px-2 py-1 text-xs hover:bg-amber-100 disabled:opacity-50"
                      >
                        {reabrindo === f.id ? 'Reabrindo…' : 'Reabrir'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="mt-6 rounded border bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Aviso:</strong> reabrir caixa libera o operador a lançar/editar.
        A reabertura fica registrada na observação + auditoria. Use só pra corrigir erro.
      </div>
    </div>
  )
}
