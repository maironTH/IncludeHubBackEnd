// src/modules/categorias/categorias.repository.ts
import { prisma } from "../../lib/prisma";

export class CategoriasRepository {
  // Retorna todas as categorias em ordem alfabética
  async listarTodas() {
    return prisma.categoria.findMany({
      orderBy: { nome: "asc" },
    });
  }

  // Busca uma categoria por ID para validações relacionais
  async encontrarPorId(id: number) {
    return prisma.categoria.findUnique({
      where: { id },
    });
  }
}

export const categoriasRepository = new CategoriasRepository();