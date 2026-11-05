export const CODIGOS_ERRO_DOMINIO = ['DATA_INVALIDA', 'VALOR_INVALIDO'] as const

export type CodigoErroDominio = (typeof CODIGOS_ERRO_DOMINIO)[number]

export class ErroDominio extends Error {
  readonly codigo: CodigoErroDominio

  constructor(codigo: CodigoErroDominio, mensagem: string) {
    super(mensagem)
    this.name = 'ErroDominio'
    this.codigo = codigo
  }
}