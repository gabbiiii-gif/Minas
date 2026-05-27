import { z } from 'zod'

const totalCampos = z.object({
  dinheiro: z.number().int().nonnegative(),
  pix: z.number().int().nonnegative(),
  debito: z.number().int().nonnegative(),
  credito: z.number().int().nonnegative(),
})

export const fechamentoInputSchema = z
  .object({
    caderno: totalCampos,
    fisico: totalCampos,
    observacao: z.string().max(500).optional(),
  })

export type FechamentoInput = z.infer<typeof fechamentoInputSchema>
