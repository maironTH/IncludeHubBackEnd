import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { autenticar } from "../../middlewares/autenticar";
import { validar } from "../../middlewares/validar";
import { dashboardQuerySchema } from "./dashboard.schema";

export const dashboardRoutes = Router();

// Todos os três papéis acessam; o service devolve o conteúdo escopado para cada um
dashboardRoutes.get(
  "/",
  autenticar,
  validar(dashboardQuerySchema, "query"),
  dashboardController.obter
);
