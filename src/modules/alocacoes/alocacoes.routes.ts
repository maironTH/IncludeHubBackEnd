// src/modules/alocacoes/alocacoes.routes.ts
import { Router } from "express";
import { alocacoesController } from "./alocacoes.controller";
import { autenticar } from "../../middlewares/autenticar";
import { exigirPapel } from "../../middlewares/exigir-papel";
import { validar } from "../../middlewares/validar";
import {
  criarAlocacaoSchema,
  minhasAlocacoesQuerySchema,
  listarAlocacoesQuerySchema,
} from "./alocacoes.schema";

export const alocacoesRoutes = Router();

// Todas as rotas de alocações exigem login
alocacoesRoutes.use(autenticar);

// GET /api/alocacoes/minhas?semana= -> Projetos em que a pessoa logada pode lançar horas na semana
// AVISO DE ARQUITETURA: Deve ser registrado antes de /:id para não ser interpretado como parâmetro
alocacoesRoutes.get(
  "/minhas",
  validar(minhasAlocacoesQuerySchema, "query"),
  alocacoesController.minhas
);

// GET /api/alocacoes -> Lista alocações (suporta ?projetoId=X e ?pessoaId=Y)
alocacoesRoutes.get(
  "/",
  validar(listarAlocacoesQuerySchema, "query"),
  alocacoesController.listar
);

// POST /api/alocacoes -> Cadastra vínculo (ADMIN e GERENTE)
alocacoesRoutes.post(
  "/",
  exigirPapel(["ADMIN", "GERENTE"]),
  validar(criarAlocacaoSchema),
  alocacoesController.criar
);

// DELETE /api/alocacoes/:id -> Remove uma alocação (ADMIN e GERENTE do projeto)
alocacoesRoutes.delete(
  "/:id",
  exigirPapel(["ADMIN", "GERENTE"]),
  alocacoesController.remover
);
