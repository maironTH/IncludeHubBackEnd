// src/modules/alocacoes/alocacoes.repository.ts
import { prisma } from "../../lib/prisma";

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

  // Lista a equipe de um projeto específico
  async listarPorProjeto(projetoId: number) {
    return prisma.alocacao.findMany({
      where: { projetoId },
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
        categoria: true,
      },
      orderBy: { id: "asc" },
    });
  }

  // Busca uma alocação por ID com detalhes do projeto
  async buscarPorId(id: number) {
    return prisma.alocacao.findUnique({
      where: { id },
      include: {
        projeto: true,
        pessoa: true,
        categoria: true,
      },
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
          select: { id: true, nome: true, email: true, papel: true, horasSemanais: true },
        },
        projeto: {
          select: { id: true, nome: true, gerenteId: true, tipo: true, status: true },
        },
        categoria: true,
      },
    });
  }

  // Remove uma alocação do banco
  async deletar(id: number) {
    return prisma.alocacao.delete({
      where: { id },
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

  // Busca todas as alocações da pessoa em projetos ativos (para cálculo de capacidade)
  async buscarAlocacoesDaPessoa(pessoaId: number) {
    return prisma.alocacao.findMany({
      where: {
        pessoaId,
        projeto: { ativo: true },
      },
      include: {
        projeto: true,
      },
    });
  }

  // Busca alocações vigentes de uma pessoa em uma semana específica
  async buscarAlocacoesVigentesNaSemana(pessoaId: number, inicioSemana: Date, fimSemana: Date) {
    return prisma.alocacao.findMany({
      where: {
        pessoaId,
        projeto: { ativo: true },
        inicio: { lte: fimSemana },
        OR: [
          { fim: null },
          { fim: { gte: inicioSemana } },
        ],
      },
      include: {
        projeto: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            status: true,
          },
        },
      },
      orderBy: { projetoId: "asc" },
    });
  }

  // Busca projetos internos ativos (qualquer colaborador pode lançar neles)
  async buscarProjetosInternosAtivos() {
    return prisma.projeto.findMany({
      where: {
        tipo: "INTERNO",
        ativo: true,
      },
      orderBy: { id: "asc" },
    });
  }

  // Busca projetos ativos que são gerenciados por um gerente específico
  async buscarProjetosGerenciadosAtivos(gerenteId: number) {
    return prisma.projeto.findMany({
      where: {
        gerenteId,
        ativo: true,
      },
      orderBy: { id: "asc" },
    });
  }
}

export const alocacoesRepository = new AlocacoesRepository();