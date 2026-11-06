import { ErroDominio } from './erros'

export const ROTULOS_OCUPACAO = ['SOBRECARREGADO', 'NORMAL', 'DISPONIVEL'] as const
export type RotuloOcupacao = (typeof ROTULOS_OCUPACAO)[number]

export const LIMITES_OCUPACAO = { sobrecarga: 90, normal: 50 } as const

export interface EntradaOcupacao {
  readonly horasSemanais: number
  readonly horasLancadas: number
  readonly horasPrevistas: number
}

export interface TaxaOcupacao {
  readonly percentual: number
  readonly rotulo: RotuloOcupacao
}

export interface ResultadoOcupacao {
  readonly realizada: TaxaOcupacao
  readonly planejada: TaxaOcupacao
  readonly horasLivres: number
  readonly disponibilidadeRestante: number
}

export function calcularPercentual(horas: number, horasBase: number): number {
  if (!Number.isFinite(horasBase) || horasBase <= 0) {
    throw new ErroDominio('VALOR_INVALIDO', 'horasBase deve ser um número maior que zero.')
  }
  if (!Number.isFinite(horas) || horas < 0) {
    throw new ErroDominio('VALOR_INVALIDO', 'horas deve ser um número maior ou igual a zero.')
  }
  return (horas * 100) / horasBase
}

export function classificarOcupacao(percentual: number): RotuloOcupacao {
  if (percentual >= LIMITES_OCUPACAO.sobrecarga) return 'SOBRECARREGADO'
  if (percentual >= LIMITES_OCUPACAO.normal) return 'NORMAL'
  return 'DISPONIVEL'
}

export function arredondarPercentual(percentual: number): number {
  return Math.round(percentual * 10) / 10
}

function montarTaxa(percentualBruto: number): TaxaOcupacao {
  return {
    percentual: arredondarPercentual(percentualBruto),
    rotulo: classificarOcupacao(percentualBruto),
  }
}

export function calcularOcupacao(entrada: Readonly<EntradaOcupacao>): ResultadoOcupacao {
  const { horasSemanais, horasLancadas, horasPrevistas } = entrada

  const realizadaBruta = calcularPercentual(horasLancadas, horasSemanais)
  const planejadaBruta = calcularPercentual(horasPrevistas, horasSemanais)

  return {
    realizada: montarTaxa(realizadaBruta),
    planejada: montarTaxa(planejadaBruta),
    horasLivres: Math.max(0, horasSemanais - horasPrevistas),
    disponibilidadeRestante: arredondarPercentual(Math.max(0, 100 - planejadaBruta)),
  }
}