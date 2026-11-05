import { NextFunction, Request, Response } from "express";
import { Papel } from "@prisma/client";
import { ErroHttp } from "../lib/erros";

export function exigirPapel(papeisPermitidos: Papel[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ErroHttp(401, "Não autenticado");
    }

    if (!papeisPermitidos.includes(req.user.papel)) {
      throw new ErroHttp(403, "Sem permissão para esta ação");
    }

    next();
  };
}