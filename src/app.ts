// src/app.ts
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { pessoasRoutes } from "./modules/pessoas/pessoas.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { categoriasRoutes } from "./modules/categorias/categorias.routes"; // <-- Adicionar
import { alocacoesRoutes } from "./modules/alocacoes/alocacoes.routes";     // <-- Adicionar
import { tratarErros } from "./middlewares/tratar-erros";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Módulos
app.use("/api/auth", authRoutes);
app.use("/api/pessoas", pessoasRoutes);
app.use("/api/categorias", categoriasRoutes); // <-- Registrar aqui
app.use("/api/alocacoes", alocacoesRoutes);   // <-- Registrar aqui

// Rotas existentes
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

// Middleware de erros sempre no final
app.use(tratarErros);