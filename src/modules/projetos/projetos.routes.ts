import { Router } from "express";
import { projetosController } from "./projetos.controller";
import { alocacoesController } from "../alocacoes/alocacoes.controller";
import { autenticar } from "../../middlewares/autenticar";
import { exigirPapel } from "../../middlewares/exigir-papel";
import { validar } from "../../middlewares/validar";
import {
  criarProjetoSchema,
  atualizarProjetoSchema,
  listarProjetosQuerySchema,
  alterarStatusSchema,
} from "./projetos.schema";
import { criarAlocacaoNoProjetoSchema } from "../alocacoes/alocacoes.schema";

export const projetosRoutes = Router();

// Todas as rotas de projetos exigem autenticação
projetosRoutes.use(autenticar);

// GET /api/projetos -> Lista projetos com visibilidade controlada pelo Service
projetosRoutes.get("/", validar(listarProjetosQuerySchema, "query"), projetosController.listar);

// GET /api/projetos/:id -> Detalhe do projeto
projetosRoutes.get("/:id", projetosController.buscarPorId);

// POST /api/projetos -> Cadastro de novo projeto (Apenas ADMIN)
projetosRoutes.post("/", exigirPapel(["ADMIN"]), validar(criarProjetoSchema), projetosController.criar);

// PATCH /api/projetos/:id -> Edição de dados ou Soft Delete com { "ativo": false } (Apenas ADMIN)
projetosRoutes.patch("/:id", exigirPapel(["ADMIN"]), validar(atualizarProjetoSchema), projetosController.atualizar);

// PATCH /api/projetos/:id/status -> Altera a saúde do projeto (Apenas o GERENTE responsável)
projetosRoutes.patch(
  "/:id/status",
  exigirPapel(["GERENTE"]),
  validar(alterarStatusSchema),
  projetosController.alterarStatus
);

// GET /api/projetos/:id/historico -> Lista as mudanças de saúde do projeto
projetosRoutes.get("/:id/historico", projetosController.listarHistorico);

// GET /api/projetos/:id/alocacoes -> Equipe do projeto
projetosRoutes.get("/:id/alocacoes", alocacoesController.listarPorProjeto);

// POST /api/projetos/:id/alocacoes -> Aloca colaborador no projeto (ADMIN e GERENTE do projeto)
projetosRoutes.post(
  "/:id/alocacoes",
  exigirPapel(["ADMIN", "GERENTE"]),
  validar(criarAlocacaoNoProjetoSchema),
  alocacoesController.criarNoProjeto
);
