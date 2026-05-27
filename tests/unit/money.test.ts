import { describe, it, expect } from 'vitest'
import { parseUserInput, centsToBRL, centsToDecimal, MoneyError } from '@/lib/money'

describe('parseUserInput', () => {
  it('aceita inteiro simples', () => expect(parseUserInput('150')).toBe(15000))
  it('aceita decimal pt-BR', () => expect(parseUserInput('150,50')).toBe(15050))
  it('aceita milhar pt-BR', () => expect(parseUserInput('1.234,56')).toBe(123456))
  it('aceita decimal en-US', () => expect(parseUserInput('1234.56')).toBe(123456))
  it('aceita prefixo R$', () => expect(parseUserInput('R$ 99,90')).toBe(9990))
  it('rejeita zero', () => expect(() => parseUserInput('0')).toThrow(MoneyError))
  it('rejeita negativo', () => expect(() => parseUserInput('-10')).toThrow(MoneyError))
  it('rejeita vazio', () => expect(() => parseUserInput('')).toThrow(MoneyError))
  it('rejeita texto', () => expect(() => parseUserInput('abc')).toThrow(MoneyError))
})

describe('centsToBRL', () => {
  it('formata centavos pequenos', () => expect(centsToBRL(50)).toBe('R$ 0,50'))
  it('formata reais', () => expect(centsToBRL(15050)).toBe('R$ 150,50'))
  it('formata milhar', () => expect(centsToBRL(123456)).toBe('R$ 1.234,56'))
  it('formata zero', () => expect(centsToBRL(0)).toBe('R$ 0,00'))
  it('formata negativo', () => expect(centsToBRL(-150)).toBe('-R$ 1,50'))
})

describe('centsToDecimal', () => {
  it('150,50 sem prefixo', () => expect(centsToDecimal(15050)).toBe('150,50'))
})
