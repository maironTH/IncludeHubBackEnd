// src/modules/alocacoes/alocacoes.service.ts
import { alocacoesRepository, AlocacoesRepository } from "./alocacoes.repository";
import { CriarAlocacaoInput, ListarAlocacoesQuery } from "./alocacoes.schema";
import { ErroHttp } from "../../lib/erros";
import { Papel } from "@prisma/client";

export type UsuarioLogado = { id: number; papel: Papel };

export class AlocacoesService {
  constructor(private repo: AlocacoesRepository = alocacoesRepository) {}

  async listar(usuario: UsuarioLogado, filtros: ListarAlocacoesQuery) {
    // Se for colaborador, só pode visualizar alocações onde ele mesmo está inserido
    if (usuario.papel === "COLABORADOR") {
      return this.repo.listar({ ...filtros, pessoaId: usuario.id });
    }

    return this.repo.listar(filtros);
  }

  async criar(usuario: UsuarioLogado, dados: CriarAlocacaoInput) {
    // 1. Integridade: Pessoa existe e está ativa (Soft Delete)
    const pessoa = await this.repo.buscarPessoaAtiva(dados.pessoaId);
    if (!pessoa) {
      throw new ErroHttp(404, "Pessoa não encontrada ou está inativa");
    }

    // 2. Integridade: Projeto existe e está ativo (Soft Delete)
    const projeto = await this.repo.buscarProjetoAtivo(dados.projetoId);
    if (!projeto) {
      throw new ErroHttp(404, "Projeto não encontrado ou está inativo");
    }

    // 3. Integridade: Categoria existe
    const categoria = await this.repo.buscarCategoria(dados.categoriaId);
    if (!categoria) {
      throw new ErroHttp(404, "Categoria informada não encontrada");
    }

    // 4. Permissão: Gerente só aloca em projetos que ele gerencia
    if (usuario.papel === "GERENTE" && projeto.gerenteId !== usuario.id) {
      throw new ErroHttp(403, "Você só pode alocar colaboradores em projetos sob sua gerência");
    }

    // 5. Tratamento e validação de datas
    const inicio = dados.inicio ? new Date(dados.inicio) : new Date();
    const fim = dados.fim ? new Date(dados.fim) : null;

    if (fim && fim < inicio) {
      throw new ErroHttp(422, "A data de fim não pode ser anterior à data de início");
    }

    return this.repo.criar({
      pessoaId: dados.pessoaId,
      projetoId: dados.projetoId,
      categoriaId: dados.categoriaId,
      horasPrevistasSemana: dados.horasPrevistasSemana,
      inicio,
      fim,
    });
  }
}

export const alocacoesService = new AlocacoesService();