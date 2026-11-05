import { ErroDominio } from './erros'

export const ROTULOS_ESTOURO = ['OK', 'ATENCAO', 'ESTOURADO'] as const
export type RotuloEstouro = (typeof ROTULOS_ESTOURO)[number]

export const LIMITES_ESTOURO = { atencao: 80, estouro: 100 } as const

export type TipoProjeto = 'CLIENTE' | 'INTERNO'

export interface EntradaEstouro {
  readonly tipo: TipoProjeto
  readonly horasLancadas: number
  readonly horasContratadas: number | null
}

export interface ResultadoEstouro {
  readonly percentual: number
  readonly rotulo: RotuloEstouro
}

export function classificarEstouro(percentual: number): RotuloEstouro {
  if (percentual > LIMITES_ESTOURO.estouro) return 'ESTOURADO'
  if (percentual >= LIMITES_ESTOURO.atencao) return 'ATENCAO'
  return 'OK'
}

export function calcularEstouro(entrada: Readonly<EntradaEstouro>): ResultadoEstouro | null {
  const { tipo, horasLancadas, horasContratadas } = entrada

  if (tipo === 'INTERNO') return null
  if (horasContratadas === null || horasContratadas <= 0) return null

  if (!Number.isFinite(horasLancadas) || horasLancadas < 0) {
    throw new ErroDominio('VALOR_INVALIDO', 'horasLancadas deve ser um número maior ou igual a zero.')
  }

  const bruto = (horasLancadas * 100) / horasContratadas

  return {
    percentual: Math.round(bruto * 10) / 10,
    rotulo: classificarEstouro(bruto),
  }
}