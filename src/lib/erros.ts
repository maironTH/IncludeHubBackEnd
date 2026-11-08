export interface DetalheErro {
  campo: string;
  mensagem: string;
}

export class ErroHttp extends Error {
  constructor(
    public status: number,
    message: string,
    public detalhes?: DetalheErro[]
  ) {
    super(message);
  }
}