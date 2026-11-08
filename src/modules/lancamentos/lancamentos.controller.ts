// src/modules/lancamentos/lancamentos.controller.ts
import { Request, Response, NextFunction } from "express";
import { lancamentosService, LancamentosService } from "./lancamentos.service";

export class LancamentosController {
  constructor(private service: LancamentosService = lancamentosService) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.user!;
      // Pega a query validada pelo middleware de validação Zod
      const filtros = res.locals.queryValidada ?? req.query;
      const resultado = await this.service.listarLancamentos(usuario, filtros);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  salvar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.user!;
      const resultado = await this.service.salvarLancamentos(req.body, usuario);
      // PUT cria ou atualiza, portanto retorna 200 OK com o array atualizado
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };
}

export const lancamentosController = new LancamentosController();