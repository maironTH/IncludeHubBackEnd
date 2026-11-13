// src/modules/lancamentos/lancamentos.repository.ts
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export interface FiltrosListarLancamentos {
  pessoaId?: number | undefined;
  projetoId?: number | undefined;
  semanaInicio?: Date | undefined;
  visivelParaGerenteId?: number | undefined;
}

export interface ItemLancamentoLote {
  projetoId: number;
  horas: number;
  descricao?: string | null | undefined;
}

const selectPessoaSegura = {
  select: {
    id: true,
    nome: true,
  },
};

const selectProjetoSeguro = {
  select: {
    id: true,
    nome: true,
    tipo: true,
  },
};

export class LancamentosRepository {
  // Lista lançamentos com filtros opcionais ordenados por semanaInicio DESC e nome do projeto ASC
  async listar(filtros: FiltrosListarLancamentos) {
    const where: Prisma.LancamentoWhereInput = {
      ...(filtros.pessoaId && { pessoaId: filtros.pessoaId }),
      ...(filtros.projetoId && { projetoId: filtros.projetoId }),
      ...(filtros.semanaInicio && { semanaInicio: filtros.semanaInicio }),
      ...(filtros.visivelParaGerenteId && {
        OR: [
          { pessoaId: filtros.visivelParaGerenteId },
          { projeto: { gerenteId: filtros.visivelParaGerenteId } },
        ],
      }),
    };

    const lancamentos = await prisma.lancamento.findMany({
      where,
      orderBy: [
        { semanaInicio: "desc" },
        { projeto: { nome: "asc" } },
      ],
      include: {
        pessoa: selectPessoaSegura,
        projeto: selectProjetoSeguro,
      },
    });

    // Converte o tipo Decimal do Prisma para number
    return lancamentos.map((l) => ({
      ...l,
      horas: Number(l.horas),
    }));
  }

  // Grava em lote via Upsert numa única transação atômica
  async salvarEmLote(pessoaId: number, semanaInicio: Date, itens: ItemLancamentoLote[]) {
    const idsParaRemover = itens.filter((i) => i.horas === 0).map((i) => i.projetoId);
    const paraGravar = itens.filter((i) => i.horas > 0);

    const salvos = await prisma.$transaction(async (tx) => {
      // Se não existir lançamento nesses projetos, nada acontece (sem erro)
      if (idsParaRemover.length > 0) {
        await tx.lancamento.deleteMany({
          where: { pessoaId, semanaInicio, projetoId: { in: idsParaRemover } },
        });
      }

      const resultado = [];
      for (const item of paraGravar) {
        resultado.push(
          await tx.lancamento.upsert({
            where: {
              pessoaId_projetoId_semanaInicio: { pessoaId, projetoId: item.projetoId, semanaInicio },
            },
            update: { horas: item.horas, descricao: item.descricao ?? null },
            create: {
              pessoaId,
              projetoId: item.projetoId,
              semanaInicio,
              horas: item.horas,
              descricao: item.descricao ?? null,
            },
            include: { pessoa: selectPessoaSegura, projeto: selectProjetoSeguro },
          })
        );
      }
      return resultado;
    });

    return salvos.map((l) => ({ ...l, horas: Number(l.horas) }));
  }
}
export const lancamentosRepository = new LancamentosRepository();