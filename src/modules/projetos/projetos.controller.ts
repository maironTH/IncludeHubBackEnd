import { Request, Response, NextFunction } from "express";
import { projetosService, ProjetosService } from "./projetos.service";
import { ErroHttp } from "../../lib/erros";

export class ProjetosController {
  constructor(private service: ProjetosService = projetosService) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = req.user!;
      const resultado = await this.service.listarProjetos(usuario, res.locals.queryValidada);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  buscarPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(422, "ID do projeto inválido");
      }

      const usuario = req.user!;
      const resultado = await this.service.buscarProjeto(id, usuario);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await this.service.criarProjeto(req.body, req.user!);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(422, "ID do projeto inválido");
      }

      const resultado = await this.service.atualizarProjeto(id, req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  alterarStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(422, "ID do projeto inválido");
      }

      const usuario = req.user!;
      const resultado = await this.service.alterarStatus(id, req.body, usuario);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  listarHistorico = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(422, "ID do projeto inválido");
      }

      const usuario = req.user!;
      const resultado = await this.service.listarHistoricoProjeto(id, usuario);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };
}

export const projetosController = new ProjetosController();