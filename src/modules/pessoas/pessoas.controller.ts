import { Request, Response, NextFunction } from "express";
import { pessoasService, PessoasService } from "./pessoas.service";
import { listarPessoasQuerySchema } from "./pessoas.schema";
import { ErroHttp } from "../../lib/erros";

export class PessoasController {
  constructor(private service: PessoasService = pessoasService) {}

  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { papel, situacao } = listarPessoasQuerySchema.parse(req.query);
      const usuario = req.user!;
      const resultado = await this.service.listar(usuario, { papel, situacao });
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  obterPorId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(400, "ID inválido informado na URL");
      }

      const resultado = await this.service.obterPorId(id);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await this.service.criar(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        throw new ErroHttp(400, "ID inválido informado na URL");
      }

      const usuario = req.user!;
      const resultado = await this.service.atualizar(usuario, id, req.body);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}

export const pessoasController = new PessoasController();