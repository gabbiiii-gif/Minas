import { z } from 'zod'

export const formaPagamentoEnum = z.enum([
  'dinheiro',
  'pix',
  'debito',
  'credito',
  'promissoria',
])

export const formaPagamentoDireta = z.enum(['dinheiro', 'pix', 'debito', 'credito'])

export const vendaInputSchema = z.object({
  valor_total: z.number().int().positive('Valor deve ser maior que zero'),
  forma_pagamento: formaPagamentoEnum,
  cliente_id: z.string().uuid().nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
}).refine(
  (v) => v.forma_pagamento !== 'promissoria' || !!v.cliente_id,
  { message: 'Cliente é obrigatório para promissória', path: ['cliente_id'] },
)

export type VendaInput = z.infer<typeof vendaInputSchema>

export const vendaRapidaSchema = z.object({
  valor_total: z.number().int().positive(),
  forma_pagamento: formaPagamentoDireta,
  observacao: z.string().max(500).optional(),
})

export type VendaRapida = z.infer<typeof vendaRapidaSchema>
