// src/modules/alocacoes/alocacoes.service.ts
import { alocacoesRepository, AlocacoesRepository } from "./alocacoes.repository";
import {
  CriarAlocacaoInput,
  CriarAlocacaoNoProjetoInput,
  ListarAlocacoesQuery,
} from "./alocacoes.schema";
import { ErroHttp } from "../../lib/erros";
import { Papel } from "@prisma/client";
import {
  parseDataISO,
  segundaDaSemana,
  domingoDaSemana,
  formatarDataISO,
} from "../../domain/semana";

export type UsuarioLogado = { id: number; papel: Papel };

export class AlocacoesService {
  constructor(private repo: AlocacoesRepository = alocacoesRepository) {}

  // Lista todas as alocações respeitando os filtros e escopo
  async listar(usuario: UsuarioLogado, filtros: ListarAlocacoesQuery) {
    if (usuario.papel === "COLABORADOR") {
      return this.repo.listar({ ...filtros, pessoaId: usuario.id });
    }

    return this.repo.listar(filtros);
  }

  // Lista a equipe alocada em um projeto (GET /api/projetos/:id/alocacoes)
  async listarPorProjeto(usuario: UsuarioLogado, projetoId: number) {
    const projeto = await this.repo.buscarProjetoAtivo(projetoId);
    if (!projeto) {
      throw new ErroHttp(404, "Projeto não encontrado ou está inativo");
    }

    if (usuario.papel === "GERENTE" && projeto.gerenteId !== usuario.id) {
      throw new ErroHttp(403, "Você não tem permissão para visualizar este projeto");
    }

    if (usuario.papel === "COLABORADOR" && projeto.tipo !== "INTERNO") {
      const alocacoesDaPessoa = await this.repo.buscarAlocacoesDaPessoa(usuario.id);
      const estaAlocado = alocacoesDaPessoa.some((a) => a.projetoId === projetoId);
      if (!estaAlocado) {
        throw new ErroHttp(403, "Você não tem permissão para visualizar este projeto");
      }
    }

    const alocacoes = await this.repo.listarPorProjeto(projetoId);
    return alocacoes.map((a) => ({
      ...a,
      horasPrevistasSemana: Number(a.horasPrevistasSemana),
    }));
  }

  // Cria alocação em um projeto específico com validação de capacidade preventiva (POST /api/projetos/:id/alocacoes)
  async criarNoProjeto(
    usuario: UsuarioLogado,
    projetoId: number,
    dados: CriarAlocacaoNoProjetoInput
  ) {
    // 1. Integridade: Projeto existe e está ativo (Soft Delete)
    const projeto = await this.repo.buscarProjetoAtivo(projetoId);
    if (!projeto) {
      throw new ErroHttp(404, "Projeto não encontrado ou está inativo");
    }

    // 2. Permissão: Gerente só aloca em projetos sob sua gerência
    if (usuario.papel === "GERENTE" && projeto.gerenteId !== usuario.id) {
      throw new ErroHttp(403, "Você só pode alocar colaboradores em projetos sob sua gerência");
    }

    // 3. Integridade: Pessoa existe e está ativa (Soft Delete)
    const pessoa = await this.repo.buscarPessoaAtiva(dados.pessoaId);
    if (!pessoa) {
      throw new ErroHttp(404, "Pessoa não encontrada ou está inativa");
    }

    // 4. Integridade: Categoria existe
    const categoria = await this.repo.buscarCategoria(dados.categoriaId);
    if (!categoria) {
      throw new ErroHttp(404, "Categoria informada não encontrada");
    }

    // 5. Tratamento de datas em UTC
    let inicio: Date;
    if (dados.inicio) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dados.inicio)) {
        inicio = parseDataISO(dados.inicio);
      } else {
        const parsed = new Date(dados.inicio);
        if (isNaN(parsed.getTime())) {
          throw new ErroHttp(422, `Data inválida: "${dados.inicio}". Use o formato AAAA-MM-DD.`);
        }
        inicio = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      }
    } else {
      const hoje = new Date();
      inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    }

    let fim: Date | null = null;
    if (dados.fim) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dados.fim)) {
        fim = parseDataISO(dados.fim);
      } else {
        const parsed = new Date(dados.fim);
        if (isNaN(parsed.getTime())) {
          throw new ErroHttp(422, `Data inválida: "${dados.fim}". Use o formato AAAA-MM-DD.`);
        }
        fim = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
      }
    }

    if (fim && fim < inicio) {
      throw new ErroHttp(422, "A data de fim não pode ser anterior à data de início");
    }

    // 6. Restrição do PostgreSQL: Não permitir alocações da mesma pessoa no mesmo projeto sobrepostas
    const alocacoesDaPessoa = await this.repo.buscarAlocacoesDaPessoa(dados.pessoaId);
    const inicioNovoTime = inicio.getTime();
    const fimNovoTime = fim ? fim.getTime() : Infinity;

    const alocacaoMesmoProjeto = alocacoesDaPessoa.some((a) => {
      if (a.projetoId !== projetoId) return false;
      const fimATime = a.fim ? a.fim.getTime() : Infinity;
      return a.inicio.getTime() <= fimNovoTime && fimATime >= inicioNovoTime;
    });

    if (alocacaoMesmoProjeto) {
      throw new ErroHttp(422, "Colaborador já possui alocação neste projeto no período informado");
    }

    // 7. Conferência de capacidade preventiva
    const sobrepostas = alocacoesDaPessoa.filter((a) => {
      const fimATime = a.fim ? a.fim.getTime() : Infinity;
      return a.inicio.getTime() <= fimNovoTime && fimATime >= inicioNovoTime;
    });

    // Analisa as semanas críticas dentro do intervalo da nova alocação
    const datasParaChecar: Date[] = [inicio];
    for (const a of sobrepostas) {
      if (a.inicio.getTime() >= inicioNovoTime && a.inicio.getTime() <= fimNovoTime) {
        datasParaChecar.push(a.inicio);
      }
    }

    let maxHorasAlocadas = 0;
    for (const dataRef of datasParaChecar) {
      const semanaInicio = segundaDaSemana(dataRef);
      const semanaFim = domingoDaSemana(dataRef);
      const semanaInicioTime = semanaInicio.getTime();
      const semanaFimTime = semanaFim.getTime();

      const somaSemana = sobrepostas
        .filter((a) => {
          const fimATime = a.fim ? a.fim.getTime() : Infinity;
          return a.inicio.getTime() <= semanaFimTime && fimATime >= semanaInicioTime;
        })
        .reduce((acc, a) => acc + Number(a.horasPrevistasSemana), 0);

      if (somaSemana > maxHorasAlocadas) {
        maxHorasAlocadas = somaSemana;
      }
    }

    if (maxHorasAlocadas + dados.horasPrevistasSemana > pessoa.horasSemanais) {
      throw new ErroHttp(
        422,
        `Pessoa já tem ${maxHorasAlocadas} h alocadas de ${pessoa.horasSemanais} h`
      );
    }

    // 8. Persistência
    const nova = await this.repo.criar({
      pessoaId: dados.pessoaId,
      projetoId,
      categoriaId: dados.categoriaId,
      horasPrevistasSemana: dados.horasPrevistasSemana,
      inicio,
      fim,
    });

    return {
      ...nova,
      horasPrevistasSemana: Number(nova.horasPrevistasSemana),
    };
  }

  // Mantém compatibilidade com rota que envia projetoId no corpo
  async criar(usuario: UsuarioLogado, dados: CriarAlocacaoInput) {
    return this.criarNoProjeto(usuario, dados.projetoId, dados);
  }

  // Remove uma alocação (DELETE /api/alocacoes/:id)
  async remover(usuario: UsuarioLogado, id: number) {
    const alocacao = await this.repo.buscarPorId(id);
    if (!alocacao) {
      throw new ErroHttp(404, "Alocação não encontrada");
    }

    // Gerente só remove de projetos que gerencia; Admin remove qualquer uma
    if (usuario.papel === "GERENTE" && alocacao.projeto.gerenteId !== usuario.id) {
      throw new ErroHttp(403, "Você só pode remover alocações de projetos sob sua gerência");
    }

    await this.repo.deletar(id);
  }

  // Retorna os projetos em que a pessoa logada pode lançar horas na semana (GET /api/alocacoes/minhas?semana=)
  async minhas(usuario: UsuarioLogado, semanaParam?: string) {
    let segunda: Date;
    if (semanaParam) {
      const dataRef = parseDataISO(semanaParam);
      segunda = segundaDaSemana(dataRef);
    } else {
      const hoje = new Date();
      segunda = segundaDaSemana(hoje);
    }

    const domingo = domingoDaSemana(segunda);
    const domingoFim = new Date(
      Date.UTC(domingo.getUTCFullYear(), domingo.getUTCMonth(), domingo.getUTCDate(), 23, 59, 59, 999)
    );
    const semanaFormatada = formatarDataISO(segunda);

    const alocacoes = await this.repo.buscarAlocacoesVigentesNaSemana(
      usuario.id,
      segunda,
      domingoFim
    );

    const projetosMap = new Map<
      number,
      {
        id: number;
        nome: string;
        tipo: string;
        horasPrevistasSemana: number | null;
      }
    >();

    // 1. Projetos com alocação vigente na semana (projetos internos sempre com horasPrevistasSemana: null)
    for (const aloc of alocacoes) {
      const horas =
        aloc.projeto.tipo === "INTERNO" ? null : Number(aloc.horasPrevistasSemana);
      const existente = projetosMap.get(aloc.projeto.id);
      if (existente && existente.horasPrevistasSemana !== null && horas !== null) {
        existente.horasPrevistasSemana += horas;
      } else {
        projetosMap.set(aloc.projeto.id, {
          id: aloc.projeto.id,
          nome: aloc.projeto.nome,
          tipo: aloc.projeto.tipo,
          horasPrevistasSemana: horas,
        });
      }
    }

    // 2. Se for gerente, inclui projetos gerenciados ativos mesmo sem alocação
    if (usuario.papel === "GERENTE") {
      const gerenciados = await this.repo.buscarProjetosGerenciadosAtivos(usuario.id);
      for (const proj of gerenciados) {
        if (!projetosMap.has(proj.id)) {
          projetosMap.set(proj.id, {
            id: proj.id,
            nome: proj.nome,
            tipo: proj.tipo,
            horasPrevistasSemana: null,
          });
        }
      }
    }

    // 3. Projetos internos ativos (sempre abertos para lançamento com horasPrevistasSemana: null)
    const internos = await this.repo.buscarProjetosInternosAtivos();
    for (const proj of internos) {
      if (!projetosMap.has(proj.id)) {
        projetosMap.set(proj.id, {
          id: proj.id,
          nome: proj.nome,
          tipo: proj.tipo,
          horasPrevistasSemana: null,
        });
      }
    }

    return {
      semana: semanaFormatada,
      projetos: Array.from(projetosMap.values()),
    };
  }
}

export const alocacoesService = new AlocacoesService();
