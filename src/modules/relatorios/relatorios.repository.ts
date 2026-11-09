import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// Só o que o relatório precisa de cada pessoa
const selecaoPessoa = {
  id: true,
  nome: true,
  horasSemanais: true,
  categoria: { select: { id: true, nome: true } },
} satisfies Prisma.PessoaSelect;

export type PessoaRelatorio = Prisma.PessoaGetPayload<{ select: typeof selecaoPessoa }>;

export class RelatoriosRepository {
  // Alocação vigente = o período dela cruza a semana
  private vigenteNaSemana(inicio: Date, fim: Date): Prisma.AlocacaoWhereInput {
    return { inicio: { lte: fim }, OR: [{ fim: null }, { fim: { gte: inicio } }] };
  }

  // Admin: todos que trabalham (o admin não lança horas)
  pessoasDeTrabalho(): Promise<PessoaRelatorio[]> {
    return prisma.pessoa.findMany({
      where: { ativo: true, papel: { in: ["GERENTE", "COLABORADOR"] } },
      select: selecaoPessoa,
      orderBy: { nome: "asc" },
    });
  }

  pessoasPorIds(ids: number[]): Promise<PessoaRelatorio[]> {
    return prisma.pessoa.findMany({
      where: { id: { in: ids }, ativo: true },
      select: selecaoPessoa,
      orderBy: { nome: "asc" },
    });
  }

  // Equipe do gerente: quem tem alocação ativa em projetos ativos dele
  async idsDaEquipeDoGerente(gerenteId: number, inicio: Date, fim: Date): Promise<number[]> {
    const alocacoes = await prisma.alocacao.findMany({
      where: { ...this.vigenteNaSemana(inicio, fim), projeto: { gerenteId, ativo: true } },
      select: { pessoaId: true },
      distinct: ["pessoaId"],
    });
    return alocacoes.map((a) => a.pessoaId);
  }

  // Horas lançadas na semana, somadas por pessoa
  async horasLancadasPorPessoa(ids: number[], semana: Date): Promise<Map<number, number>> {
    const grupos = await prisma.lancamento.groupBy({
      by: ["pessoaId"],
      where: { pessoaId: { in: ids }, semanaInicio: semana },
      _sum: { horas: true },
    });
    return new Map(grupos.map((g) => [g.pessoaId, Number(g._sum.horas ?? 0)]));
  }

  // Por pessoa: soma das horas previstas e quantos projetos distintos (só projetos ativos)
  async alocacoesVigentes(
    ids: number[],
    inicio: Date,
    fim: Date
  ): Promise<Map<number, { horasPrevistas: number; projetos: number }>> {
    const alocacoes = await prisma.alocacao.findMany({
      where: { pessoaId: { in: ids }, projeto: { ativo: true }, ...this.vigenteNaSemana(inicio, fim) },
      select: { pessoaId: true, projetoId: true, horasPrevistasSemana: true },
    });

    const horas = new Map<number, number>();
    const projetos = new Map<number, Set<number>>();
    for (const a of alocacoes) {
      horas.set(a.pessoaId, (horas.get(a.pessoaId) ?? 0) + Number(a.horasPrevistasSemana));
      if (!projetos.has(a.pessoaId)) projetos.set(a.pessoaId, new Set());
      projetos.get(a.pessoaId)!.add(a.projetoId);
    }

    const resultado = new Map<number, { horasPrevistas: number; projetos: number }>();
    for (const [id, total] of horas) {
      resultado.set(id, { horasPrevistas: total, projetos: projetos.get(id)!.size });
    }
    return resultado;
  }
}

export const relatoriosRepository = new RelatoriosRepository();