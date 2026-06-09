import { supabase } from '@/lib/supabase'
import type { Database, FormaPagamento } from '@/types/database'

export async function rpcCriarVendaComPromissoria(args: {
  valor: number
  cliente_id: string
  vencimento: string | null
  observacao: string | null
  data?: string
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('criar_venda_com_promissoria', {
    p_valor: args.valor,
    p_cliente_id: args.cliente_id,
    p_vencimento: args.vencimento,
    p_observacao: args.observacao,
    ...(args.data ? { p_data: args.data } : {}),
  } as never)
  return { id: (data as string | null) ?? null, error: error?.message ?? null }
}

export async function rpcReceberPromissoria(args: {
  promissoria_id: string
  valor: number
  forma: Exclude<FormaPagamento, 'promissoria'>
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('receber_promissoria', {
    p_promissoria_id: args.promissoria_id,
    p_valor: args.valor,
    p_forma: args.forma,
  })
  return { id: (data as string | null) ?? null, error: error?.message ?? null }
}

export interface ItemRecebimentoLote {
  promissoria_id: string
  /** dinheiro/pix/etc que entra no caixa (centavos, > 0) */
  valor: number
  /** abatimento concedido (centavos, >= 0) */
  desconto: number
}

/** Recebe uma ou várias promissórias num único lançamento (forma + data únicas). */
export async function rpcReceberPromissoriasLote(args: {
  itens: ItemRecebimentoLote[]
  forma: Exclude<FormaPagamento, 'promissoria'>
  data?: string
}): Promise<{ count: number | null; error: string | null }> {
  const { data, error } = await supabase.rpc('receber_promissorias_lote' as never, {
    p_itens: args.itens,
    p_forma: args.forma,
    ...(args.data ? { p_data: args.data } : {}),
  } as never)
  return { count: (data as number | null) ?? null, error: error?.message ?? null }
}

export interface FechamentoTotais {
  dinheiro: number
  pix: number
  debito: number
  credito: number
}
export async function rpcFecharCaixa(args: {
  data: string
  caderno: FechamentoTotais
  fisico: FechamentoTotais
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('fechar_caixa', {
    p_data: args.data,
    p_caderno: args.caderno as never,
    p_fisico: args.fisico as never,
  })
  return { id: (data as string | null) ?? null, error: error?.message ?? null }
}

export async function rpcExcluirVenda(args: { id: string; motivo: string }) {
  const { error } = await supabase.rpc('excluir_venda' as never, {
    p_venda_id: args.id,
    p_motivo: args.motivo,
  } as never)
  return { error: error?.message ?? null }
}

export async function rpcExcluirDespesa(args: { id: string; motivo: string }) {
  const { error } = await supabase.rpc('excluir_despesa' as never, {
    p_despesa_id: args.id,
    p_motivo: args.motivo,
  } as never)
  return { error: error?.message ?? null }
}

export async function rpcExcluirRecebimento(args: { id: string; motivo: string }) {
  const { error } = await supabase.rpc('excluir_recebimento' as never, {
    p_recebimento_id: args.id,
    p_motivo: args.motivo,
  } as never)
  return { error: error?.message ?? null }
}

export type PromissoriaAberta = Database['public']['Views']['vw_promissorias_em_aberto']['Row']

export async function listarPromissoriasAbertasDoCliente(clienteId: string): Promise<PromissoriaAberta[]> {
  const { data, error } = await supabase
    .from('vw_promissorias_em_aberto')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PromissoriaAberta[]
}
