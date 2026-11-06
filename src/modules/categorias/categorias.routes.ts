// src/modules/categorias/categorias.routes.ts
import { Router } from "express";
import { categoriasController } from "./categorias.controller";
import { autenticar } from "../../middlewares/autenticar";

export const categoriasRoutes = Router();

// Exige que o usuário esteja logado (qualquer papel: ADMIN, GERENTE ou COLABORADOR)
categoriasRoutes.use(autenticar);

// GET /api/categorias -> Lista todas as categorias cadastradas
categoriasRoutes.get("/", categoriasController.listar);