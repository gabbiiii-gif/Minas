import { z } from 'zod'

export const despesaInputSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória').max(200),
  valor: z.number().int().positive('Valor deve ser maior que zero'),
})

export type DespesaInput = z.infer<typeof despesaInputSchema>
