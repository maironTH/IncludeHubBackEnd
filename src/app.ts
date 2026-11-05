import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { pessoasRoutes } from "./modules/pessoas/pessoas.routes";
import { authRoutes } from "./modules/auth/auth.routes";


export const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Módulo de Pessoas
app.use("/api/pessoas", pessoasRoutes);

// Módulos de Auth
app.use("/api/auth", authRoutes)

// Demais rotas existentes (ex: projetos)
app.get("/api/projetos", async (_req, res) => {
  try {
    const projetos = await prisma.projeto.findMany({
      where: { ativo: true },
    });
    res.json(projetos);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar projetos", detalhe: error });
  }
});