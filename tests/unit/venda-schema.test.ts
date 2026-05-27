import { describe, it, expect } from 'vitest'
import { vendaInputSchema } from '@/schemas/venda'

describe('vendaInputSchema', () => {
  it('aceita venda dinheiro válida', () => {
    const r = vendaInputSchema.safeParse({ valor_total: 15000, forma_pagamento: 'dinheiro' })
    expect(r.success).toBe(true)
  })
  it('rejeita valor zero', () => {
    const r = vendaInputSchema.safeParse({ valor_total: 0, forma_pagamento: 'pix' })
    expect(r.success).toBe(false)
  })
  it('rejeita valor negativo', () => {
    const r = vendaInputSchema.safeParse({ valor_total: -10, forma_pagamento: 'pix' })
    expect(r.success).toBe(false)
  })
  it('rejeita forma inválida', () => {
    const r = vendaInputSchema.safeParse({ valor_total: 100, forma_pagamento: 'cheque' })
    expect(r.success).toBe(false)
  })
  it('exige cliente_id em promissória', () => {
    const r = vendaInputSchema.safeParse({ valor_total: 100, forma_pagamento: 'promissoria' })
    expect(r.success).toBe(false)
  })
  it('aceita promissória com cliente', () => {
    const r = vendaInputSchema.safeParse({
      valor_total: 100,
      forma_pagamento: 'promissoria',
      cliente_id: '00000000-0000-0000-0000-000000000001',
    })
    expect(r.success).toBe(true)
  })
})
