import { Request, Response } from "express";
import { z } from "zod";
import { pessoasService, PessoasService } from "./pessoas.service";
import { listarPessoasQuerySchema } from "./pessoas.schema";

export class PessoasController {
  constructor(private service: PessoasService = pessoasService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { papel } = listarPessoasQuerySchema.parse(req.query);
      const resultado = await this.service.listar(papel);
      res.json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ erros: error.issues });
        return;
      }
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