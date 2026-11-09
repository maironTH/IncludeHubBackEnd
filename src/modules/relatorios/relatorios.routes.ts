import { Router } from "express";
import { autenticar } from "../../middlewares/autenticar";
import { relatoriosController } from "./relatorios.controller";

export const relatoriosRoutes = Router();

//Quem decide o que cada um vê é o service
relatoriosRoutes.get("/disponibilidade", autenticar, relatoriosController.disponibilidade);