// src/modules/lancamentos/lancamentos.service.ts
import { Papel } from "@prisma/client";
import { lancamentosRepository, LancamentosRepository, FiltrosListarLancamentos } from "./lancamentos.repository";
import { projetosRepository, ProjetosRepository } from "../projetos/projetos.repository";
import { segundaDaSemana, semanaAtual } from "../../domain/semana";
import { ErroHttp } from "../../lib/erros";
import { ListarLancamentosQuery, SalvarLancamentosInput } from "./lancamentos.schema";

export type UsuarioLogado = { id: number; papel: Papel };

export class LancamentosService {
  constructor(
    private repo: LancamentosRepository = lancamentosRepository,
    private projetosRepo: ProjetosRepository = projetosRepository
  ) {}

  // 1. Listagem com controle de visibilidade estrito por papel
  async listarLancamentos(usuario: UsuarioLogado, filtros: ListarLancamentosQuery) {
    const semanaInicioNormalizada = filtros.semanaInicio
      ? segundaDaSemana(filtros.semanaInicio)
      : undefined;

    const filtrosConsulta: FiltrosListarLancamentos = {
      projetoId: filtros.projetoId,
      semanaInicio: semanaInicioNormalizada,
    };

    if (usuario.papel === "ADMIN") {
      filtrosConsulta.pessoaId = filtros.pessoaId;
    } else if (usuario.papel === "GERENTE") {
      filtrosConsulta.visivelParaGerenteId = usuario.id;
      // Permite que o gerente filtre por uma pessoa específica dentro da equipe dele
      if (filtros.pessoaId) {
        filtrosConsulta.pessoaId = filtros.pessoaId;
      }
    } else if (usuario.papel === "COLABORADOR") {
      // Colaborador só pode ver os próprios lançamentos
      filtrosConsulta.pessoaId = usuario.id;
    }

    return this.repo.listar(filtrosConsulta);
  }

  // 2. Registro Semanal em Lote (Batch Upsert)
  async salvarLancamentos(dados: SalvarLancamentosInput, usuario: UsuarioLogado) {
    // A. Normaliza a data para a segunda-feira correspondente
    const semanaNormalizada = segundaDaSemana(dados.semanaInicio);

    // B. Bloqueia lançamentos para semanas futuras (422)
    const semanaLimite = semanaAtual();
    if (semanaNormalizada.getTime() > semanaLimite.getTime()) {
      throw new ErroHttp(422, "Não é permitido registrar lançamentos para semanas futuras");
    }

    // C. Teto de sanidade: máximo de 168 horas na soma da semana (422)
    const somaHoras = dados.itens.reduce((total, item) => total + item.horas, 0);
    if (somaHoras > 168) {
      throw new ErroHttp(422, "A soma das horas lançadas na semana não pode ultrapassar 168 horas");
    }

    // D. Validação atômica pré-gravação: nenhum registro é salvo se algum item falhar
     const itensComHoras = dados.itens.filter((item) => item.horas > 0);

    await Promise.all(
      itensComHoras.map(async (item) => {
        // Valida se o projeto existe e está ativo (422)
        const projeto = await this.projetosRepo.encontrarPorId(item.projetoId);
        if (!projeto) {
          throw new ErroHttp(422, `Projeto com ID ${item.projetoId} inexistente ou inativo`);
        }

        // Pode lançar quem: (a) está alocado, (b) é o gerente do projeto
        // ou (c) o projeto é interno (e ativo, já garantido acima)
        const podeLancar =
          projeto.tipo === "INTERNO" ||
          projeto.gerenteId === usuario.id ||
          (await this.projetosRepo.usuarioEstaAlocado(usuario.id, item.projetoId));

        if (!podeLancar) {
          throw new ErroHttp(
            403,
            `Você não tem permissão para lançar horas no projeto "${projeto.nome}". Você só pode lançar horas nos projetos em que está alocado, nos que gerencia e nos internos.`
          );
        }
      })
    );

    // E. Gravação via Batch Upsert associando sempre ao ID do usuário autenticado
    return this.repo.salvarEmLote(usuario.id, semanaNormalizada, dados.itens);
  }
}

export const lancamentosService = new LancamentosService();