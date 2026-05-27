import { centsToBRL } from './money'

interface Linha {
  data: string
  hora: string
  tipo: string
  forma: string
  valor: number
  descricao: string
  operador: string
}

export function toCSV(linhas: Linha[]): string {
  const header = ['Data', 'Hora', 'Tipo', 'Forma', 'Valor', 'Descrição', 'Operador']
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = linhas.map((l) => [
    l.data,
    l.hora,
    l.tipo,
    l.forma,
    centsToBRL(l.valor),
    l.descricao,
    l.operador,
  ].map(String).map(escape).join(','))
  return [header.map(escape).join(','), ...rows].join('\r\n')
}

export function downloadCSV(content: string, nomeBase: string) {
  // BOM UTF-8 para Excel pt-BR reconhecer acentos
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeBase}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export interface RelatorioRow extends Linha {}
