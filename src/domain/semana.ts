import { ErroDominio } from './erros'

const MS_POR_DIA = 24 * 60 * 60 * 1000

declare const marcaSegundaFeira: unique symbol

export type SegundaFeira = Date & { readonly [marcaSegundaFeira]: true }

export function ehSegunda(data: Date): data is SegundaFeira {
  return data.getUTCDay() === 1 && data.getTime() % MS_POR_DIA === 0
}

export function parseDataISO(texto: string): Date {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (!partes) {
    throw new ErroDominio('DATA_INVALIDA', `Data inválida: "${texto}". Use o formato AAAA-MM-DD.`)
  }

  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new ErroDominio('DATA_INVALIDA', `Data inexistente: "${texto}".`)
  }

  return data
}

export function formatarDataISO(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function segundaDaSemana(data: Date): SegundaFeira {
  const diasDesdeSegunda = (data.getUTCDay() + 6) % 7

  const segunda = new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() - diasDesdeSegunda),
  )

  return segunda as SegundaFeira
}

export function somarSemanas(segunda: SegundaFeira, semanas: number): SegundaFeira {
  if (!Number.isInteger(semanas)) {
    throw new ErroDominio('VALOR_INVALIDO', 'A quantidade de semanas deve ser um número inteiro.')
  }

  const resultado = new Date(
    Date.UTC(segunda.getUTCFullYear(), segunda.getUTCMonth(), segunda.getUTCDate() + semanas * 7),
  )
  return resultado as SegundaFeira
}

export function domingoDaSemana(data: Date): Date {
  const segunda = segundaDaSemana(data)
  return new Date(
    Date.UTC(segunda.getUTCFullYear(), segunda.getUTCMonth(), segunda.getUTCDate() + 6),
  )
}

// Adicionar ao final de src/domain/semana.ts:
export function semanaAtual(hoje: Date = new Date()): SegundaFeira {
  return segundaDaSemana(hoje)
}