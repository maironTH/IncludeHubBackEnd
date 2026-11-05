import { prisma } from '../../lib/prisma'; 

export class AuthRepository {
  async buscarPorEmail(email: string) {
    return await prisma.pessoa.findUnique({
      where: { email },
    });
  }

  async buscarPorId(id: number) {
    return await prisma.pessoa.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        categoriaId: true,
        horasSemanais: true,
        ativo: true,
        // senhaHash excluído intencionalmente
      },
    });
  }
}