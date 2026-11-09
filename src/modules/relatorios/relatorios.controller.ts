import { NextFunction, Request, Response } from "express";
import { relatorioDisponibilidadeQuerySchema } from "./relatorios.schema";
import { relatoriosService, RelatoriosService } from "./relatorios.service";

export class RelatoriosController {
  constructor(private service: RelatoriosService = relatoriosService) {}

  disponibilidade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { semana } = relatorioDisponibilidadeQuerySchema.parse(req.query);
      res.json(await this.service.disponibilidade(req.user!, semana));
    } catch (erro) {
      next(erro);
    }
  };
}

export const relatoriosController = new RelatoriosController();