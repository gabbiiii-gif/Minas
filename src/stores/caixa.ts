import { create } from 'zustand'
import type { Database, FormaPagamento } from '@/types/database'

export type Venda = Database['public']['Tables']['vendas']['Row']
export type Recebimento = Database['public']['Tables']['recebimentos_promissoria']['Row']
export type Despesa = Database['public']['Tables']['despesas']['Row']

interface Totais {
  dinheiro: number
  pix: number
  debito: number
  credito: number
  promissoria: number
}

const ZERO_TOTAIS: Totais = { dinheiro: 0, pix: 0, debito: 0, credito: 0, promissoria: 0 }

interface CaixaState {
  vendas: Venda[]
  recebimentos: Recebimento[]
  despesas: Despesa[]
  totaisVendas: Totais
  totaisRecebimentos: Omit<Totais, 'promissoria'>
  totalDespesas: number
  fechado: boolean
  setVendas: (v: Venda[]) => void
  setRecebimentos: (r: Recebimento[]) => void
  setDespesas: (d: Despesa[]) => void
  setFechado: (f: boolean) => void
}

function somar(rows: Array<{ valor_total?: number; valor?: number; forma_pagamento: FormaPagamento }>): Totais {
  const t = { ...ZERO_TOTAIS }
  for (const r of rows) {
    const v = (r.valor_total ?? r.valor ?? 0) as number
    t[r.forma_pagamento] += v
  }
  return t
}

export const useCaixaStore = create<CaixaState>((set) => ({
  vendas: [],
  recebimentos: [],
  despesas: [],
  totaisVendas: ZERO_TOTAIS,
  totaisRecebimentos: { dinheiro: 0, pix: 0, debito: 0, credito: 0 },
  totalDespesas: 0,
  fechado: false,
  setVendas: (vendas) => set({ vendas, totaisVendas: somar(vendas) }),
  setRecebimentos: (recebimentos) => {
    const t = somar(recebimentos)
    set({
      recebimentos,
      totaisRecebimentos: {
        dinheiro: t.dinheiro,
        pix: t.pix,
        debito: t.debito,
        credito: t.credito,
      },
    })
  },
  setDespesas: (despesas) =>
    set({ despesas, totalDespesas: despesas.reduce((s, d) => s + d.valor, 0) }),
  setFechado: (fechado) => set({ fechado }),
}))
