// src/modules/alocacoes/alocacoes.controller.ts
import { Request, Response, NextFunction } from "express";
import { alocacoesService, AlocacoesService } from "./alocacoes.service";
import { listarAlocacoesQuerySchema } from "./alocacoes.schema";

export class AlocacoesController {
  constructor(private service: AlocacoesService = alocacoesService) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtros = listarAlocacoesQuerySchema.parse(req.query);
      const usuario = req.user!;
      const resultado = await this.service.listar(usuario, filtros);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.user!;
      const resultado = await this.service.criar(usuario, req.body);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  };
}

export const alocacoesController = new AlocacoesController();