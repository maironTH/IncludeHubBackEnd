import { prisma } from "../../lib/prisma";
import { Prisma, StatusProjeto, TipoProjeto } from "@prisma/client";

export interface FiltrosListarProjetos {
  nome?: string | undefined;
  cliente?: string | undefined;
  status?: StatusProjeto | undefined;
  tipo?: TipoProjeto | undefined;
  gerenteId?: number | undefined;
  alocadoPessoaId?: number | undefined;
}

// Projeção segura do gerente para nunca expor a senhaHash
const selectGerenteSeguro = {
  select: {
    id: true,
    nome: true,
    email: true,
  },
};

export class ProjetosRepository {
  // Lista projetos ativos aplicando filtros opcionais e ordenando por nome
  async listar(filtros: FiltrosListarProjetos) {
    const where: Prisma.ProjetoWhereInput = {
      ativo: true, // Regra estrita de Soft Delete
      ...(filtros.nome && {
        nome: { contains: filtros.nome, mode: "insensitive" },
      }),
      ...(filtros.cliente && {
        cliente: { contains: filtros.cliente, mode: "insensitive" },
      }),
      ...(filtros.status && { status: filtros.status }),
      ...(filtros.tipo && { tipo: filtros.tipo }),
      ...(filtros.gerenteId && { gerenteId: filtros.gerenteId }),
      ...(filtros.alocadoPessoaId && {
        alocacoes: {
          some: { pessoaId: filtros.alocadoPessoaId },
        },
      }),
    };

    return prisma.projeto.findMany({
      where,
      orderBy: { nome: "asc" },
      include: {
        gerente: selectGerenteSeguro,
      },
    });
  }

  // Busca projeto ativo por ID
  async encontrarPorId(id: number) {
    return prisma.projeto.findFirst({
      where: { id, ativo: true },
      include: {
        gerente: selectGerenteSeguro,
      },
    });
  }

  // Cria um novo projeto (status inicial padrão é NO_PRAZO)
  async criar(dados: Prisma.ProjetoCreateInput) {
    return prisma.projeto.create({
      data: dados,
      include: {
        gerente: selectGerenteSeguro,
      },
    });
  }

  // Atualiza dados cadastrais
  async atualizar(id: number, dados: Prisma.ProjetoUpdateInput) {
    return prisma.projeto.update({
      where: { id },
      data: dados,
      include: {
        gerente: selectGerenteSeguro,
      },
    });
  }

  // Soft Delete: inativa o projeto sem apagar alocações ou lançamentos
  async inativar(id: number) {
    return prisma.projeto.update({
      where: { id },
      data: { ativo: false },
      include: {
        gerente: selectGerenteSeguro,
      },
    });
  }

  // Verifica no banco se a pessoa possui alocação no projeto
  async usuarioEstaAlocado(pessoaId: number, projetoId: number): Promise<boolean> {
    const total = await prisma.alocacao.count({
      where: {
        pessoaId,
        projetoId,
      },
    });
    return total > 0;
  }

  // Atualização de Status + Criação de Histórico em UMA ÚNICA TRANSAÇÃO
  async atualizarStatus(
    projetoId: number,
    status: StatusProjeto,
    justificativa: string | null | undefined,
    alteradoPorId: number
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Atualiza status no projeto
      const projetoAtualizado = await tx.projeto.update({
        where: { id: projetoId },
        data: { status },
        include: {
          gerente: selectGerenteSeguro,
        },
      });

      // 2. Cria registro imutável no histórico
      await tx.historicoStatus.create({
        data: {
          projetoId,
          status,
          justificativa: justificativa ?? null,
          alteradoPorId,
        },
      });

      return projetoAtualizado;
    });
  }

  // Lista o histórico de alterações ordenado do mais recente para o mais antigo
  async listarHistorico(projetoId: number) {
    return prisma.historicoStatus.findMany({
      where: { projetoId },
      orderBy: { criadoEm: "desc" },
      include: {
        alteradoPor: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });
  }
}

export const projetosRepository = new ProjetosRepository();