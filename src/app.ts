import express from "express";
import { prisma } from "./lib/prisma";

export const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/projetos", async (_req, res) => {
  try {
    const projetos = await prisma.projeto.findMany({
      where: { ativo: true }
    });
    res.json(projetos);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar projetos", detalhe: error });
  }
});