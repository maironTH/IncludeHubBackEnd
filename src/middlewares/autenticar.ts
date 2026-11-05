import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Papel } from "@prisma/client";
import { config } from "../lib/config";
import { ErroHttp } from "../lib/erros";
import { pessoasRepository } from "../modules/pessoas/pessoas.repository";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; papel: Papel };
    }
  }
}

type PayloadToken = { id: string | number; papel: Papel };

export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new ErroHttp(401, "Token não informado"));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as unknown as PayloadToken;
    const usuarioAtivo = await pessoasRepository.encontrarAtivaPorId(Number(payload.id));

    // Garante que se o usuário for inativado no banco, seu token para de funcionar imediatamente
    if (!usuarioAtivo) {
      return next(new ErroHttp(401, "Usuário inativado ou inexistente"));
    }

    req.user = { id: usuarioAtivo.id, papel: usuarioAtivo.papel };
    next();
  } catch {
    return next(new ErroHttp(401, "Token inválido ou expirado"));
  }
}
