// src/modules/lancamentos/lancamentos.routes.ts
import { Router } from "express";
import { lancamentosController } from "./lancamentos.controller";
import { autenticar } from "../../middlewares/autenticar";
import { exigirPapel } from "../../middlewares/exigir-papel";
import { validar } from "../../middlewares/validar";
import {
  listarLancamentosQuerySchema,
  salvarLancamentosSchema,
} from "./lancamentos.schema";

export const lancamentosRoutes = Router();

// Todas as rotas de lançamentos exigem token válido
lancamentosRoutes.use(autenticar);

// GET /api/lancamentos -> Consulta lançamentos com visibilidade por papel
lancamentosRoutes.get(
  "/",
  validar(listarLancamentosQuerySchema, "query"),
  lancamentosController.listar
);

// PUT e POST /api/lancamentos -> Registro em lote de horas da semana (Apenas GERENTE e COLABORADOR)
lancamentosRoutes.put(
  "/",
  exigirPapel(["GERENTE", "COLABORADOR"]),
  validar(salvarLancamentosSchema, "body"),
  lancamentosController.salvar
);

lancamentosRoutes.post(
  "/",
  exigirPapel(["GERENTE", "COLABORADOR"]),
  validar(salvarLancamentosSchema, "body"),
  lancamentosController.salvar
);