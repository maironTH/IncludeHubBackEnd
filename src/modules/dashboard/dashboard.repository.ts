import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// Uma alocação conta na semana quando o período dela cruza a semana
function cruzaSemana(inicio: Date, fim: Date): Prisma.AlocacaoWhereInput {
  return {
    inicio: { lte: fim },
    OR: [{ fim: null }, { fim: { gte: inicio } }],
  };
}

export class DashboardRepository {
  // Projetos de cliente ativos. Com gerenteId, só os desse gerente.
  async projetosClienteAtivos(gerenteId?: number) {
    return prisma.projeto.findMany({
      where: {
        ativo: true,
        tipo: "CLIENTE",
        ...(gerenteId ? { gerenteId } : {}),
      },
      select: { id: true, nome: true, status: true, tipo: true },
      orderBy: { nome: "asc" },
    });
  }

  // Todos os gerentes e colaboradores ativos (o admin não entra no cálculo de ocupação)
  async pessoasAtivasDeTrabalho() {
    return prisma.pessoa.findMany({
      where: {
        ativo: true,
        papel: { in: ["GERENTE", "COLABORADOR"] },
      },
      select: { id: true, nome: true, horasSemanais: true, papel: true },
      orderBy: { nome: "asc" },
    });
  }

  // Pessoas com alocação vigente nos projetos informados (a "equipe" do gerente)
  async pessoasAlocadasNosProjetos(projetoIds: number[], inicio: Date, fim: Date) {
    const alocacoes = await prisma.alocacao.findMany({
      where: {
        projetoId: { in: projetoIds },
        projeto: { ativo: true },
        ...cruzaSemana(inicio, fim),
      },
      select: { pessoaId: true },
      distinct: ["pessoaId"],
    });
    return alocacoes.map((a) => a.pessoaId);
  }

  async pessoasPorIds(ids: number[]) {
    return prisma.pessoa.findMany({
      where: { id: { in: ids }, ativo: true },
      select: { id: true, nome: true, horasSemanais: true, papel: true },
      orderBy: { nome: "asc" },
    });
  }

  // Horas lançadas na semana por pessoa, em todos os projetos (ocupação realizada)
  async horasLancadasPorPessoa(pessoaIds: number[], semana: Date) {
    const linhas = await prisma.lancamento.groupBy({
      by: ["pessoaId"],
      where: { pessoaId: { in: pessoaIds }, semanaInicio: semana },
      _sum: { horas: true },
    });
    return new Map(linhas.map((l) => [l.pessoaId, Number(l._sum.horas ?? 0)]));
  }

  // Horas previstas nas alocações vigentes por pessoa, só de projetos ativos (ocupação planejada)
  async horasPrevistasPorPessoa(pessoaIds: number[], inicio: Date, fim: Date) {
    const linhas = await prisma.alocacao.groupBy({
      by: ["pessoaId"],
      where: {
        pessoaId: { in: pessoaIds },
        projeto: { ativo: true },
        ...cruzaSemana(inicio, fim),
      },
      _sum: { horasPrevistasSemana: true },
    });
    return new Map(linhas.map((l) => [l.pessoaId, Number(l._sum.horasPrevistasSemana ?? 0)]));
  }

  // Total de horas lançadas na semana nos projetos informados (para o gerente)
  async horasNosProjetos(projetoIds: number[], semana: Date) {
    const r = await prisma.lancamento.aggregate({
      where: { projetoId: { in: projetoIds }, semanaInicio: semana },
      _sum: { horas: true },
    });
    return Number(r._sum.horas ?? 0);
  }

  // Total de todas as horas lançadas na semana (para o admin)
  async totalHorasLancadasNaSemana(semana: Date) {
    const r = await prisma.lancamento.aggregate({
      where: { semanaInicio: semana },
      _sum: { horas: true },
    });
    return Number(r._sum.horas ?? 0);
  }

  // Projetos ativos em que a pessoa tem alocação vigente na semana
  async projetosDaPessoa(pessoaId: number, inicio: Date, fim: Date) {
    const alocacoes = await prisma.alocacao.findMany({
      where: {
        pessoaId,
        projeto: { ativo: true },
        ...cruzaSemana(inicio, fim),
      },
      select: {
        projeto: {
          select: { id: true, nome: true, tipo: true, status: true },
        },
      },
      distinct: ["projetoId"],
    });
    return alocacoes.map((a) => a.projeto);
  }
}

export const dashboardRepository = new DashboardRepository();
