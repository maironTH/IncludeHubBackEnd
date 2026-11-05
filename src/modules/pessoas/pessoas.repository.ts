import { prisma } from "../../lib/prisma";
import { Prisma, Papel } from "@prisma/client";

export type Situacao = "ativas" | "inativas" | "todas";

function filtroDeSituacao(situacao: Situacao): Prisma.PessoaWhereInput {
  if (situacao === "ativas") return { ativo: true };
  if (situacao === "inativas") return { ativo: false };
  return {}; // "todas": sem filtro
}

export class PessoasRepository {
  // Retorna somente pessoas ativas (Soft Delete), opcionalmente filtrando por papel
  async encontrarTodos(papel?: Papel, situacao: Situacao = "ativas") {
    return prisma.pessoa.findMany({
      where: {
        ...filtroDeSituacao(situacao),
        ...(papel ? { papel } : {}),
      },
      include: {
        categoria: true,
      },
      orderBy: { nome: "asc" },
    });
  }

  // Busca por ID independente do status ativo (ou para validação de existência)
  async encontrarPorId(id: number) {
    return prisma.pessoa.findUnique({
      where: { id },
      include: {
        categoria: true,
      },
    });
  }

  // Busca por ID só se a pessoa estiver ativa.
  // Usada no middleware autenticar e para validar alocações.
  async encontrarAtivaPorId(id: number) {
    return prisma.pessoa.findFirst({
      where: { id, ativo: true },
    });
  }

  // Busca por e-mail (usado para checar duplicidade)
  // Ignora filtro ativo
  async encontrarPorEmail(email: string) {
    return prisma.pessoa.findUnique({
      where: { email },
    });
  }

  // Devolve somente as ativas. usada no login
   async encontrarAtivaPorEmail(email: string) {
    return prisma.pessoa.findFirst({
      where: { email, ativo: true },
    });
  }

   // Quantos admins ativos existem (regra do "último admin").
  async contarAdminsAtivos() {
    return prisma.pessoa.count({
      where: { papel: "ADMIN", ativo: true },
    });
  }

  // Quantos projetos ativos estão sob a responsabilidade deste gerente.
  async contarProjetosAtivosDoGerente(gerenteId: number) {
    return prisma.projeto.count({
      where: {
        gerenteId,
        ativo: true,
      },
    });
  }

  // Insere nova pessoa no banco
  async criar(dados: Prisma.PessoaCreateInput) {
    return prisma.pessoa.create({
      data: dados,
      include: {
        categoria: true,
      },
    });
  }

  // Atualiza campos cadastrais da pessoa
  async atualizar(id: number, dados: Prisma.PessoaUpdateInput) {
    return prisma.pessoa.update({
      where: { id },
      data: dados,
      include: {
        categoria: true,
      },
    });
  }

  // Executa o Soft Delete alternando ativo para false
  async inativar(id: number) {
    return prisma.pessoa.update({
      where: { id },
      data: { ativo: false },
      include: {
        categoria: true,
      },
    });
  }
}

export const pessoasRepository = new PessoasRepository();