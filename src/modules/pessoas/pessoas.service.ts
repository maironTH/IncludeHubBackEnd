import bcrypt from "bcrypt";
import { pessoasRepository, PessoasRepository } from "./pessoas.repository";
import { CriarPessoaInput, AtualizarPessoaInput } from "./pessoas.schema";
import { Prisma, Papel } from "@prisma/client";

export class PessoasService {
  constructor(private repo: PessoasRepository = pessoasRepository) {}

  // Remove a senhaHash do objeto retornado
  private sanitizarPessoa<T extends { senhaHash?: string }>(pessoa: T): Omit<T, "senhaHash"> {
    const { senhaHash, ...resto } = pessoa;
    return resto;
  }

  async listar(papel?: Papel) {
    const pessoas = await this.repo.encontrarTodos(papel);
    return pessoas.map((p) => this.sanitizarPessoa(p));
  }

  async obterPorId(id: number) {
    const pessoa = await this.repo.encontrarPorId(id);
    if (!pessoa) {
      const erro = new Error("Pessoa não encontrada");
      (erro as any).statusCode = 404;
      throw erro;
    }
    return this.sanitizarPessoa(pessoa);
  }

  async criar(dados: CriarPessoaInput) {
    // 1. Validação de e-mail existente
    const emailExistente = await this.repo.encontrarPorEmail(dados.email);
    if (emailExistente) {
      const erro = new Error("E-mail já cadastrado no sistema");
      (erro as any).statusCode = 409;
      throw erro;
    }

    // 2. Criptografia de senha com bcrypt
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(dados.senha, saltRounds);

    // 3. Montagem dos dados para o Prisma
    const dadosPrisma: Prisma.PessoaCreateInput = {
      nome: dados.nome,
      email: dados.email,
      senhaHash,
      papel: dados.papel,
      horasSemanais: dados.horasSemanais,
      ...(dados.categoriaId ? { categoria: { connect: { id: dados.categoriaId } } } : {}),
    };

    const novaPessoa = await this.repo.criar(dadosPrisma);
    return this.sanitizarPessoa(novaPessoa);
  }

  async atualizar(id: number, dados: AtualizarPessoaInput) {
    // 1. Verifica se a pessoa existe
    const pessoaExistente = await this.repo.encontrarPorId(id);
    if (!pessoaExistente) {
      const erro = new Error("Pessoa não encontrada");
      (erro as any).statusCode = 404;
      throw erro;
    }

    // 2. Se informou novo e-mail, verificar se outro usuário já usa
    if (dados.email && dados.email !== pessoaExistente.email) {
      const emailEmUso = await this.repo.encontrarPorEmail(dados.email);
      if (emailEmUso && emailEmUso.id !== id) {
        const erro = new Error("O e-mail informado já está em uso por outra pessoa");
        (erro as any).statusCode = 409;
        throw erro;
      }
    }

    // 3. Se for caso exclusivo de inativação (ativo: false)
    if (dados.ativo === false && Object.keys(dados).length === 1) {
      const pessoaInativada = await this.repo.inativar(id);
      return this.sanitizarPessoa(pessoaInativada);
    }

    // 4. Se informou nova senha, gerar novo hash
    let senhaHashAtualizada: string | undefined;
    if (dados.senha) {
      senhaHashAtualizada = await bcrypt.hash(dados.senha, 10);
    }

    // 5. Montar payload do Prisma
    const dadosPrisma: Prisma.PessoaUpdateInput = {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.email !== undefined && { email: dados.email }),
      ...(senhaHashAtualizada && { senhaHash: senhaHashAtualizada }),
      ...(dados.papel !== undefined && { papel: dados.papel }),
      ...(dados.horasSemanais !== undefined && { horasSemanais: dados.horasSemanais }),
      ...(dados.ativo !== undefined && { ativo: dados.ativo }),
      ...(dados.categoriaId !== undefined
        ? dados.categoriaId === null
          ? { categoria: { disconnect: true } }
          : { categoria: { connect: { id: dados.categoriaId } } }
        : {}),
    };

    const pessoaAtualizada = await this.repo.atualizar(id, dadosPrisma);
    return this.sanitizarPessoa(pessoaAtualizada);
  }
}

export const pessoasService = new PessoasService();