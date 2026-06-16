import { useState } from 'react'
import { toast } from 'sonner'
import { centsToBRL } from '@/lib/money'
import { formatTimeBelem, hojeBelem } from '@/lib/date'
import { supabase } from '@/lib/supabase'
import { toCSV, downloadCSV, type RelatorioRow } from '@/lib/report'
import { BlurText } from '@/components/reactbits/BlurText'
import { CountUp } from '@/components/reactbits/CountUp'

export default function Relatorios() {
  const today = hojeBelem()
  const [inicio, setInicio] = useState(today)
  const [fim, setFim] = useState(today)
  const [rows, setRows] = useState<RelatorioRow[]>([])
  const [loading, setLoading] = useState(false)
  const [resumo, setResumo] = useState({ vendas: 0, recebimentos: 0, despesas: 0 })

  async function gerar() {
    if (inicio > fim) { toast.error('Data início > fim'); return }
    setLoading(true)

    const [vendas, recebimentos, despesas] = await Promise.all([
      supabase.from('vendas')
        .select('id, data, created_at, valor_total, forma_pagamento, observacao, operador_id, profiles!vendas_operador_id_fkey(nome)')
        .gte('data', inicio).lte('data', fim).is('deleted_at', null)
        .order('created_at'),
      supabase.from('recebimentos_promissoria')
        .select('id, data, created_at, valor, forma_pagamento, operador_id, profiles!recebimentos_promissoria_operador_id_fkey(nome)')
        .gte('data', inicio).lte('data', fim)
        .order('created_at'),
      supabase.from('despesas')
        .select('id, data, created_at, valor, descricao, operador_id, profiles!despesas_operador_id_fkey(nome)')
        .gte('data', inicio).lte('data', fim).is('deleted_at', null)
        .order('created_at'),
    ])

    if (vendas.error || recebimentos.error || despesas.error) {
      toast.error('Falha ao gerar relatório')
      setLoading(false)
      return
    }

    const result: RelatorioRow[] = []
    for (const v of (vendas.data ?? []) as Array<any>) {
      result.push({
        data: v.data,
        hora: formatTimeBelem(v.created_at),
        tipo: 'VENDA',
        forma: v.forma_pagamento,
        valor: v.valor_total,
        descricao: v.observacao ?? '',
        operador: v.profiles?.nome ?? '',
      })
    }
    for (const r of (recebimentos.data ?? []) as Array<any>) {
      result.push({
        data: r.data,
        hora: formatTimeBelem(r.created_at),
        tipo: 'RECEB. PROMISSÓRIA',
        forma: r.forma_pagamento,
        valor: r.valor,
        descricao: 'Quitação de promissória',
        operador: r.profiles?.nome ?? '',
      })
    }
    for (const d of (despesas.data ?? []) as Array<any>) {
      result.push({
        data: d.data,
        hora: formatTimeBelem(d.created_at),
        tipo: 'DESPESA',
        forma: '-',
        valor: d.valor,
        descricao: d.descricao,
        operador: d.profiles?.nome ?? '',
      })
    }
    result.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    setRows(result)
    setResumo({
      vendas: ((vendas.data ?? []) as any[]).reduce((s, v) => s + v.valor_total, 0),
      recebimentos: ((recebimentos.data ?? []) as any[]).reduce((s, r) => s + r.valor, 0),
      despesas: ((despesas.data ?? []) as any[]).reduce((s, d) => s + d.valor, 0),
    })
    setLoading(false)
    toast.success(`${result.length} linha(s) carregadas`)
  }

  function exportar() {
    if (rows.length === 0) { toast.error('Sem dados pra exportar'); return }
    downloadCSV(toCSV(rows), `relatorio-${inicio}-a-${fim}`)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold"><BlurText text="Relatórios" /></h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Filtre por período e exporte em CSV (compatível Excel).
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium">Início</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium">Fim</label>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <button onClick={gerar} disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? 'Gerando…' : 'Gerar'}
        </button>
        <button onClick={exportar} disabled={rows.length === 0}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
          Baixar CSV
        </button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Resumo label="Vendas (bruto)" valor={resumo.vendas} />
            <Resumo label="Recebimentos" valor={resumo.recebimentos} subtitle="quita dívidas" />
            <Resumo label="Despesas" valor={resumo.despesas} negativo />
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold uppercase text-muted-foreground">
            {rows.length} linhas
          </h3>
          <div className="max-h-[60vh] overflow-auto rounded-xl border shadow-sm">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted/80 text-left backdrop-blur">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Valor</th>
                  <th>Descrição</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-t transition-colors hover:bg-muted/40">
                    <td className="px-3 py-1.5">{r.data}</td>
                    <td>{r.hora}</td>
                    <td>{r.tipo}</td>
                    <td className="capitalize">{r.forma}</td>
                    <td className="font-mono">{centsToBRL(r.valor)}</td>
                    <td className="max-w-xs truncate">{r.descricao}</td>
                    <td>{r.operador}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && (
              <p className="border-t bg-muted/30 p-2 text-center text-xs text-muted-foreground">
                Mostrando 200 primeiras. Use "Baixar CSV" pra o relatório completo.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Resumo({ label, valor, subtitle, negativo }: { label: string; valor: number; subtitle?: string; negativo?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold ${negativo && valor > 0 ? 'text-destructive' : ''}`}>
        {negativo && valor > 0 ? '-' : ''}
        <CountUp value={valor} format={centsToBRL} />
      </p>
      {subtitle && <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
