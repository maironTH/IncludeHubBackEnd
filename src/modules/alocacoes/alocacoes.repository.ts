// src/modules/alocacoes/alocacoes.repository.ts
import { prisma } from "../../lib/prisma";
import { ListarAlocacoesQuery } from "./alocacoes.schema";

export class AlocacoesRepository {
  // Lista alocações com dados completos das entidades associadas
  async listar(filtros: {
  projetoId?: number | undefined;
  pessoaId?: number | undefined;
} = {}) {
    return prisma.alocacao.findMany({
      where: {
        ...(filtros?.projetoId ? { projetoId: filtros.projetoId } : {}),
        ...(filtros?.pessoaId ? { pessoaId: filtros.pessoaId } : {}),
      },
      include: {
        pessoa: {
          select: {
            id: true,
            nome: true,
            email: true,
            papel: true,
            horasSemanais: true,
            ativo: true,
          },
        },
        projeto: {
          select: {
            id: true,
            nome: true,
            cliente: true,
            gerenteId: true,
            status: true,
            tipo: true,
            ativo: true,
          },
        },
        categoria: true,
      },
      orderBy: { id: "asc" },
    });
  }

  // Cria um novo vínculo de alocação
  async criar(dados: {
    pessoaId: number;
    projetoId: number;
    categoriaId: number;
    horasPrevistasSemana: number;
    inicio: Date;
    fim: Date | null;
  }) {
    return prisma.alocacao.create({
      data: {
        pessoaId: dados.pessoaId,
        projetoId: dados.projetoId,
        categoriaId: dados.categoriaId,
        horasPrevistasSemana: dados.horasPrevistasSemana,
        inicio: dados.inicio,
        fim: dados.fim,
      },
      include: {
        pessoa: {
          select: { id: true, nome: true, email: true, papel: true },
        },
        projeto: {
          select: { id: true, nome: true, gerenteId: true },
        },
        categoria: true,
      },
    });
  }

  // Métodos auxiliares para validações de integridade e Soft Delete
  async buscarPessoaAtiva(id: number) {
    return prisma.pessoa.findFirst({
      where: { id, ativo: true },
    });
  }

  async buscarProjetoAtivo(id: number) {
    return prisma.projeto.findFirst({
      where: { id, ativo: true },
    });
  }

  async buscarCategoria(id: number) {
    return prisma.categoria.findUnique({
      where: { id },
    });
  }
}

export const alocacoesRepository = new AlocacoesRepository();