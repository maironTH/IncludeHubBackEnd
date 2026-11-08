import express from "express";
import cors from "cors";
import { authRoutes } from "./modules/auth/auth.routes";
import { pessoasRoutes } from "./modules/pessoas/pessoas.routes";
import { categoriasRoutes } from "./modules/categorias/categorias.routes";
import { alocacoesRoutes } from "./modules/alocacoes/alocacoes.routes";
import { projetosRoutes } from "./modules/projetos/projetos.routes";
import { lancamentosRoutes } from "./modules/lancamentos/lancamentos.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { tratarErros } from "./middlewares/tratar-erros";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Módulos da API
app.use("/api/auth", authRoutes);
app.use("/api/pessoas", pessoasRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/alocacoes", alocacoesRoutes);
app.use("/api/projetos", projetosRoutes);
app.use("/api/lancamentos", lancamentosRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(tratarErros);