// Conversões R$ <-> centavos. Sempre tratar dinheiro como bigint/number em centavos.

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/**
 * Converte input do usuário (pt-BR) para centavos.
 * Aceita: "150", "150,50", "1.234,56", "1234.56", "R$ 99,90".
 * Rejeita: "", "0", negativos, NaN.
 */
export function parseUserInput(raw: string): number {
  if (typeof raw !== 'string') throw new MoneyError('Entrada inválida')
  let v = raw.trim().replace(/^R\$\s*/i, '')
  if (!v) throw new MoneyError('Valor obrigatório')

  // Detecta separador decimal: vírgula tem prioridade em pt-BR
  const hasComma = v.includes(',')
  const hasDot = v.includes('.')

  if (hasComma && hasDot) {
    // "1.234,56" — pontos são milhares
    v = v.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    v = v.replace(',', '.')
  }
  // se só ponto, assume separador decimal estilo en-US ("1234.56")

  if (!/^-?\d+(\.\d+)?$/.test(v)) {
    throw new MoneyError(`Formato inválido: "${raw}"`)
  }

  const f = Number.parseFloat(v)
  if (!Number.isFinite(f)) throw new MoneyError('Valor inválido')
  if (f <= 0) throw new MoneyError('Valor deve ser maior que zero')

  const cents = Math.round(f * 100)
  if (!Number.isSafeInteger(cents)) throw new MoneyError('Valor muito grande')
  return cents
}

/** Formata centavos como "R$ 1.234,56". */
export function centsToBRL(cents: number): string {
  if (!Number.isFinite(cents)) return '—'
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const reais = Math.floor(abs / 100)
  const cs = String(abs % 100).padStart(2, '0')
  const reaisStr = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}R$ ${reaisStr},${cs}`
}

/** Sem prefixo, p/ inputs. */
export function centsToDecimal(cents: number): string {
  const abs = Math.abs(cents)
  const reais = Math.floor(abs / 100)
  const cs = String(abs % 100).padStart(2, '0')
  return `${cents < 0 ? '-' : ''}${reais},${cs}`
}
