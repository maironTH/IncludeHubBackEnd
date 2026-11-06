// src/modules/alocacoes/alocacoes.routes.ts
import { Router } from "express";
import { alocacoesController } from "./alocacoes.controller";
import { autenticar } from "../../middlewares/autenticar";
import { exigirPapel } from "../../middlewares/exigir-papel";
import { validar } from "../../middlewares/validar";
import { criarAlocacaoSchema } from "./alocacoes.schema";

export const alocacoesRoutes = Router();

// Todas as rotas de alocações exigem login
alocacoesRoutes.use(autenticar);

// GET /api/alocacoes -> Lista alocações (suporta ?projetoId=X e ?pessoaId=Y)
alocacoesRoutes.get("/", alocacoesController.listar);

// POST /api/alocacoes -> Cadastra vínculo (apenas ADMIN e GERENTE)
alocacoesRoutes.post(
  "/",
  exigirPapel(["ADMIN", "GERENTE"]),
  validar(criarAlocacaoSchema),
  alocacoesController.criar
);