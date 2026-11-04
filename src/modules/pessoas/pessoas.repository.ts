import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export class PessoasRepository {
  // Retorna somente pessoas ativas (Soft Delete)
  async encontrarTodos() {
    return prisma.pessoa.findMany({
      where: { ativo: true },
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

  // Busca por e-mail (usado para checar duplicidade)
  async encontrarPorEmail(email: string) {
    return prisma.pessoa.findUnique({
      where: { email },
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
    });
  }
}

export const pessoasRepository = new PessoasRepository();