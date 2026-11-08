import bcrypt from "bcrypt";
import { pessoasRepository, PessoasRepository, Situacao } from "./pessoas.repository";
import { CriarPessoaInput, AtualizarPessoaInput } from "./pessoas.schema";
import { Prisma, Papel } from "@prisma/client";
import { ErroHttp } from "../../lib/erros";

export type UsuarioLogado = { id: number; papel: Papel };

export class PessoasService {
  constructor(private repo: PessoasRepository = pessoasRepository) {}

  // Remove a senhaHash do objeto retornado
  private sanitizarPessoa<T extends { senhaHash?: string }>(pessoa: T): Omit<T, "senhaHash"> {
    const { senhaHash, ...resto } = pessoa;
    return resto;
  }

  async listar(usuario: UsuarioLogado, filtros: { papel?: Papel | undefined; situacao: Situacao }) {
    if (filtros.situacao !== "ativas" && usuario.papel !== "ADMIN") {
      throw new ErroHttp(403, "Apenas administradores podem listar pessoas inativas ou todas");
    }

    const pessoas = await this.repo.encontrarTodos(filtros.papel, filtros.situacao);
    return pessoas.map((p) => this.sanitizarPessoa(p));
  }

  async obterPorId(id: number) {
    const pessoa = await this.repo.encontrarPorId(id);
    if (!pessoa) {
      throw new ErroHttp(404, "Pessoa não encontrada");
    }
    return this.sanitizarPessoa(pessoa);
  }

  async criar(dados: CriarPessoaInput) {
    // 1. Validação de e-mail existente (independente de estar ativo ou não)
    const emailExistente = await this.repo.encontrarPorEmail(dados.email);
    if (emailExistente) {
      throw new ErroHttp(422, "Dados inválidos", [{ campo: "email", mensagem: "E-mail já cadastrado" }]);
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

  async atualizar(usuario: UsuarioLogado, id: number, dados: AtualizarPessoaInput) {
    // 1. Verifica se a pessoa existe
    const pessoaExistente = await this.repo.encontrarPorId(id);
    if (!pessoaExistente) {
      throw new ErroHttp(404, "Pessoa não encontrada");
    }

    const vaiInativar = dados.ativo === false;
    const vaiAlterarPapel = dados.papel !== undefined && dados.papel !== pessoaExistente.papel;

    // 2. Um admin não pode desativar a si próprio
    if (vaiInativar && usuario.id === id) {
      throw new ErroHttp(422, "Você não pode desativar seu próprio usuário");
    }

    // 3. Regra do último admin: não permitir inativar nem rebaixar o único admin ativo
    if (pessoaExistente.papel === "ADMIN" && pessoaExistente.ativo && (vaiInativar || (vaiAlterarPapel && dados.papel !== "ADMIN"))) {
      const adminsAtivos = await this.repo.contarAdminsAtivos();
      if (adminsAtivos <= 1) {
        throw new ErroHttp(422, "Não é possível desativar ou alterar o papel do único administrador ativo");
      }
    }

    // 4. Regra do gerente com projetos ativos: não pode inativar nem rebaixar gerente com projetos ativos
    if (pessoaExistente.papel === "GERENTE" && (vaiInativar || (vaiAlterarPapel && dados.papel !== "GERENTE"))) {
      const projetosAtivos = await this.repo.contarProjetosAtivosDoGerente(id);
      if (projetosAtivos > 0) {
        throw new ErroHttp(
          422,
          "Não é possível desativar ou alterar o papel de um gerente que possui projetos ativos sob sua responsabilidade"
        );
      }
    }

    // 5. Se informou novo e-mail, verificar se outro usuário já usa
    if (dados.email && dados.email !== pessoaExistente.email) {
      const emailEmUso = await this.repo.encontrarPorEmail(dados.email);
      if (emailEmUso && emailEmUso.id !== id) {
        throw new ErroHttp(422, "Dados inválidos", [{ campo: "email", mensagem: "E-mail já cadastrado" }]);
      }
    }

    // 6. Se for caso exclusivo de inativação (ativo: false)
    if (dados.ativo === false && Object.keys(dados).length === 1) {
      const pessoaInativada = await this.repo.inativar(id);
      return this.sanitizarPessoa(pessoaInativada);
    }

    // 5. Se informou nova senha, gerar novo hash
    let senhaHashAtualizada: string | undefined;
    if (dados.senha) {
      senhaHashAtualizada = await bcrypt.hash(dados.senha, 10);
    }

    // 6. Montar payload do Prisma
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