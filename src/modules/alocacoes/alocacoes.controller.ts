// src/modules/alocacoes/alocacoes.controller.ts
import { Request, Response, NextFunction } from "express";
import { alocacoesService, AlocacoesService } from "./alocacoes.service";
import {
  listarAlocacoesQuerySchema,
  minhasAlocacoesQuerySchema,
} from "./alocacoes.schema";
import { ErroHttp } from "../../lib/erros";

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

  listarPorProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projetoId = Number(req.params.id);
      if (isNaN(projetoId)) {
        throw new ErroHttp(422, "ID de projeto inválido informado na URL");
      }

      const usuario = req.user!;
      const resultado = await this.service.listarPorProjeto(usuario, projetoId);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  criarNoProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projetoId = Number(req.params.id);
      if (isNaN(projetoId)) {
        throw new ErroHttp(422, "ID de projeto inválido informado na URL");
      }

      const usuario = req.user!;
      const resultado = await this.service.criarNoProjeto(usuario, projetoId, req.body);
      res.status(201).json(resultado);
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

  remover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(422, "ID inválido informado na URL");
      }

      const usuario = req.user!;
      await this.service.remover(usuario, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  minhas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { semana } = minhasAlocacoesQuerySchema.parse(req.query);
      const usuario = req.user!;
      const resultado = await this.service.minhas(usuario, semana);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };
}

export const alocacoesController = new AlocacoesController();
