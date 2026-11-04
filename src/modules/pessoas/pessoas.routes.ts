import { Router } from "express";
import { pessoasController } from "./pessoas.controller";
import { validar } from "../../middlewares/validar";
import { criarPessoaSchema, atualizarPessoaSchema } from "./pessoas.schema";

export const pessoasRoutes = Router();

// GET /api/pessoas -> Lista pessoas ativas
pessoasRoutes.get("/", pessoasController.listar);

// POST /api/pessoas -> Cadastra nova pessoa com validação Zod
pessoasRoutes.post("/", validar(criarPessoaSchema), pessoasController.criar);

// PATCH /api/pessoas/:id -> Edita dados ou realiza Soft Delete com { "ativo": false }
pessoasRoutes.patch("/:id", validar(atualizarPessoaSchema), pessoasController.atualizar);