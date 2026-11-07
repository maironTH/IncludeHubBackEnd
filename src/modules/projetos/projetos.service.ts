import { Papel, Prisma, StatusProjeto } from "@prisma/client";
import { projetosRepository, ProjetosRepository, FiltrosListarProjetos } from "./projetos.repository";
import { pessoasRepository, PessoasRepository } from "../pessoas/pessoas.repository";
import { CriarProjetoInput, AtualizarProjetoInput, AlterarStatusInput, ListarProjetosQuery } from "./projetos.schema";
import { ErroHttp } from "../../lib/erros";

export type UsuarioLogado = { id: number; papel: Papel };

export class ProjetosService {
  constructor(
    private repo: ProjetosRepository = projetosRepository,
    private pessoasRepo: PessoasRepository = pessoasRepository
  ) {}

  // 1. Listagem com visibilidade baseada no papel do usuário
  async listarProjetos(usuario: UsuarioLogado, filtros: ListarProjetosQuery) {
    const filtrosConsulta: FiltrosListarProjetos = { ...filtros };

    if (usuario.papel === "ADMIN") {
      // Admin não tem restrições de visibilidade
    } else if (usuario.papel === "GERENTE") {
      // Gerente só pode ver projetos que ele gerencia (ignora qualquer gerenteId passado)
      filtrosConsulta.gerenteId = usuario.id;
    } else if (usuario.papel === "COLABORADOR") {
      // Colaborador só visualiza projetos onde está alocado
      delete filtrosConsulta.gerenteId;
      filtrosConsulta.alocadoPessoaId = usuario.id;
    }

    return this.repo.listar(filtrosConsulta);
  }

  // 2. Busca projeto por ID com validação de acesso
  async buscarProjeto(id: number, usuario: UsuarioLogado) {
    const projeto = await this.repo.encontrarPorId(id);

    if (!projeto) {
      throw new ErroHttp(404, "Projeto não encontrado ou inativo");
    }

    // Regras de visibilidade
    if (usuario.papel === "ADMIN") {
      return projeto;
    }

    if (usuario.papel === "GERENTE") {
      if (projeto.gerenteId !== usuario.id) {
        throw new ErroHttp(403, "Você não tem permissão para visualizar este projeto");
      }
      return projeto;
    }

    if (usuario.papel === "COLABORADOR") {
      const estaAlocado = await this.repo.usuarioEstaAlocado(usuario.id, id);
      if (!estaAlocado) {
        throw new ErroHttp(403, "Você não tem permissão para visualizar este projeto");
      }
      return projeto;
    }

    return projeto;
  }

  // 3. Cadastra novo projeto
  async criarProjeto(dados: CriarProjetoInput) {
    // Validação de gerente se informado
    if (dados.gerenteId) {
      const gerente = await this.pessoasRepo.encontrarAtivaPorId(dados.gerenteId);
      if (!gerente || gerente.papel !== "GERENTE") {
        throw new ErroHttp(422, "O gerente informado deve ser um usuário ativo com papel de GERENTE");
      }
    }

    // Se for CLIENTE, validações de integridade
    if (dados.tipo === "CLIENTE") {
      if (!dados.cliente) {
        throw new ErroHttp(422, "Cliente é obrigatório para projetos do tipo CLIENTE");
      }
      if (!dados.horasContratadas || dados.horasContratadas <= 0) {
        throw new ErroHttp(422, "Horas contratadas devem ser maiores que zero para projetos do tipo CLIENTE");
      }
      if (!dados.gerenteId) {
        throw new ErroHttp(422, "Gerente é obrigatório para projetos do tipo CLIENTE");
      }
    }

    // Validação de datas
    if (dados.inicio && dados.fimPrevisto && dados.fimPrevisto < dados.inicio) {
      throw new ErroHttp(422, "A data de fim previsto não pode ser anterior à data de início");
    }

    // O status inicial é SEMPRE NO_PRAZO (forçado na regra de negócio)
    const dadosPrisma: Prisma.ProjetoCreateInput = {
      nome: dados.nome,
      tipo: dados.tipo,
      cliente: dados.tipo === "CLIENTE" ? dados.cliente ?? null : null,
      horasContratadas: dados.tipo === "CLIENTE" ? dados.horasContratadas ?? null : null,
      status: "NO_PRAZO",
      inicio: dados.inicio ? new Date(dados.inicio) : null,
      fimPrevisto: dados.fimPrevisto ? new Date(dados.fimPrevisto) : null,
      ativo: true,
      ...(dados.gerenteId ? { gerente: { connect: { id: dados.gerenteId } } } : {}),
    };

    return this.repo.criar(dadosPrisma);
  }

  // 4. Atualização e Soft Delete
  async atualizarProjeto(id: number, dados: AtualizarProjetoInput) {
    const projetoExistente = await this.repo.encontrarPorId(id);
    if (!projetoExistente) {
      throw new ErroHttp(404, "Projeto não encontrado ou inativo");
    }

    // Se for solicitação de Soft Delete
    if (dados.ativo === false) {
      return this.repo.inativar(id);
    }

    // Revalidação de gerente caso tenha sido alterado
    if (dados.gerenteId !== undefined && dados.gerenteId !== null) {
      const gerente = await this.pessoasRepo.encontrarAtivaPorId(dados.gerenteId);
      if (!gerente || gerente.papel !== "GERENTE") {
        throw new ErroHttp(422, "O novo gerente deve ser um usuário ativo com papel de GERENTE");
      }
    }

    // Revalidação de datas cruzando valores novos com os existentes
    const dataInicioFinal = dados.inicio !== undefined ? dados.inicio : projetoExistente.inicio;
    const dataFimFinal = dados.fimPrevisto !== undefined ? dados.fimPrevisto : projetoExistente.fimPrevisto;

    if (dataInicioFinal && dataFimFinal && dataFimFinal < dataInicioFinal) {
      throw new ErroHttp(422, "A data de fim previsto não pode ser anterior à data de início");
    }

    // Revalidação de regras de tipo de projeto
    const tipoFinal = dados.tipo ?? projetoExistente.tipo;
    const clienteFinal = dados.cliente !== undefined ? dados.cliente : projetoExistente.cliente;
    const horasFinal = dados.horasContratadas !== undefined ? dados.horasContratadas : projetoExistente.horasContratadas;

    if (tipoFinal === "CLIENTE") {
      if (!clienteFinal) {
        throw new ErroHttp(422, "O projeto do tipo CLIENTE exige um nome de cliente");
      }
      if (!horasFinal || horasFinal <= 0) {
        throw new ErroHttp(422, "O projeto do tipo CLIENTE exige horas contratadas maiores que zero");
      }
    }

    // O status NÃO pode ser alterado por aqui (é alterado via rota /status)
    const dadosPrisma: Prisma.ProjetoUpdateInput = {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.tipo !== undefined && { tipo: dados.tipo }),
      ...(dados.cliente !== undefined && { cliente: dados.cliente }),
      ...(dados.horasContratadas !== undefined && { horasContratadas: dados.horasContratadas }),
      ...(dados.inicio !== undefined && { inicio: dados.inicio ? new Date(dados.inicio) : null }),
      ...(dados.fimPrevisto !== undefined && { fimPrevisto: dados.fimPrevisto ? new Date(dados.fimPrevisto) : null }),
      ...(dados.ativo !== undefined && { ativo: dados.ativo }),
      ...(dados.gerenteId !== undefined
        ? dados.gerenteId === null
          ? { gerente: { disconnect: true } }
          : { gerente: { connect: { id: dados.gerenteId } } }
        : {}),
    };

    return this.repo.atualizar(id, dadosPrisma);
  }

  // 5. Alterar Saúde do Projeto (Status + Histórico)
  async alterarStatus(id: number, dados: AlterarStatusInput, usuario: UsuarioLogado) {
    const projeto = await this.repo.encontrarPorId(id);
    if (!projeto) {
      throw new ErroHttp(404, "Projeto não encontrado ou inativo");
    }

    // Validação contextual: Gerente só pode alterar status do seu próprio projeto
    if (usuario.papel === "GERENTE" && projeto.gerenteId !== usuario.id) {
      throw new ErroHttp(403, "Você só pode alterar o status de projetos que você gerencia");
    }

    if (usuario.papel === "COLABORADOR") {
      throw new ErroHttp(403, "Colaboradores não podem alterar o status do projeto");
    }

    // Se ATRASADO, justificativa é obrigatória
    if (dados.status === "ATRASADO" && (!dados.justificativa || dados.justificativa.trim().length === 0)) {
      throw new ErroHttp(422, "A justificativa é obrigatória quando o status for ATRASADO");
    }

    return this.repo.atualizarStatus(id, dados.status, dados.justificativa, usuario.id);
  }

  // 6. Listar Histórico de Alterações de Saúde
  async listarHistoricoProjeto(id: number, usuario: UsuarioLogado) {
    // Reaproveita a verificação de visibilidade de buscarProjeto
    await this.buscarProjeto(id, usuario);
    return this.repo.listarHistorico(id);
  }
}

export const projetosService = new ProjetosService();