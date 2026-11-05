import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ErroHttp } from "../lib/erros";
import { ErroDominio } from "../domain/erros";

// O Express reconhece um middleware de erros pelos 4 parâmetros.
// Por isso o `_next` precisa existir, mesmo sem uso.
export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Erros que nós mesmos lançamos
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }

  // Erros de regras/cálculos do domínio (dados inválidos)
  if (erro instanceof ErroDominio) {
    res.status(422).json({ erro: erro.message });
    return;
  }

  //Dados fora do formato esperado (Zod)
  if (erro instanceof ZodError) {
    res.status(422).json({
      erro: "Dados inválidos",
      detalhes: erro.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
    });
    return;
  }

  //Erros conhecidos do Prisma
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2002") {
      // campo único
      res.status(422).json({ erro: "Já existe um registro com esse valor" });
      return;
    }
    if (erro.code === "P2025") {
      // update/delete de um registro que não existe
      res.status(404).json({ erro: "Registro não encontrado" });
      return;
    }
    if (erro.code === "P2003") {
      // chave estrangeira
      res.status(422).json({ erro: "Registro relacionado inexistente ou em uso" });
      return;
    }
  }

  //JSON malformado no corpo da requisição
  if (erro instanceof SyntaxError && "body" in erro) {
    res.status(400).json({ erro: "JSON inválido" });
    return;
  }

  //Qualquer outra coisa 
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor" });
}