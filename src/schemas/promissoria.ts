import { z } from 'zod'
import { formaPagamentoDireta } from './venda'

export const promissoriaInputSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente'),
  valor: z.number().int().positive('Valor deve ser maior que zero'),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').nullable().optional(),
  observacao: z.string().max(500).optional(),
})

export type PromissoriaInput = z.infer<typeof promissoriaInputSchema>

export const recebimentoInputSchema = z.object({
  promissoria_id: z.string().uuid(),
  valor: z.number().int().positive('Valor deve ser maior que zero'),
  forma_pagamento: formaPagamentoDireta,
})

export type RecebimentoInput = z.infer<typeof recebimentoInputSchema>
