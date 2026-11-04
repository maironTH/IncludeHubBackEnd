import { Request, Response } from "express";
import { pessoasService, PessoasService } from "./pessoas.service";

export class PessoasController {
  constructor(private service: PessoasService = pessoasService) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await this.service.listar();
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ erro: "Erro ao listar pessoas", detalhe: error.message });
    }
  };

  criar = async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await this.service.criar(req.body);
      res.status(201).json(resultado);
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ erro: error.message || "Erro ao cadastrar pessoa" });
    }
  };

  atualizar = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ erro: "ID inválido informado na URL" });
        return;
      }

      const resultado = await this.service.atualizar(id, req.body);
      res.json(resultado);
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ erro: error.message || "Erro ao atualizar pessoa" });
    }
  };
}

export const pessoasController = new PessoasController();