import { Papel, StatusProjeto } from "@prisma/client";
import { dashboardRepository, DashboardRepository } from "./dashboard.repository";
import { calcularOcupacao } from "../../domain/ocupacao";
import {
  segundaDaSemana,
  domingoDaSemana,
  formatarDataISO,
  parseDataISO,
} from "../../domain/semana";
import { ErroHttp } from "../../lib/erros";

export type UsuarioLogado = { id: number; papel: Papel };
export type Alerta = { severidade: "VERMELHO" | "AMARELO"; mensagem: string };
type ProjetoResumo = { nome: string; status: StatusProjeto };
const porSeveridade = (a: Alerta, b: Alerta) =>
  Number(a.severidade === "AMARELO") - Number(b.severidade === "AMARELO");

export class DashboardService {
  constructor(private repo: DashboardRepository = dashboardRepository) {}

  async obter(usuario: UsuarioLogado, semanaParam?: string) {
    // Semana selecionada ou atual, sempre normalizada para a segunda-feira em UTC
    let inicio: Date;
    if (semanaParam) {
      const dataRef = parseDataISO(semanaParam);
      inicio = segundaDaSemana(dataRef);
    } else {
      inicio = segundaDaSemana(new Date());
    }

    const domingo = domingoDaSemana(inicio);
    const fim = new Date(
      Date.UTC(domingo.getUTCFullYear(), domingo.getUTCMonth(), domingo.getUTCDate(), 23, 59, 59, 999)
    );
    const semana = formatarDataISO(inicio);

    if (usuario.papel === "COLABORADOR") {
      return { semana, ...(await this.visaoColaborador(usuario.id, inicio, fim)) };
    }
    return { semana, ...(await this.visaoGerencial(usuario, inicio, fim)) };
  }

  // Admin (tudo) e Gerente (só os projetos sob sua gerência)
  private async visaoGerencial(usuario: UsuarioLogado, inicio: Date, fim: Date) {
    const ehAdmin = usuario.papel === "ADMIN";
    const projetos = await this.repo.projetosClienteAtivos(ehAdmin ? undefined : usuario.id);
    const projetoIds = projetos.map((p) => p.id);

    // Quem aparece na ocupação: todos (admin) ou a equipe do gerente, mais ele mesmo
    let pessoas;
    if (ehAdmin) {
      pessoas = await this.repo.pessoasAtivasDeTrabalho();
    } else {
      const ids = await this.repo.pessoasAlocadasNosProjetos(projetoIds, inicio, fim);
      pessoas = await this.repo.pessoasPorIds([...new Set([...ids, usuario.id])]);
    }
    const pessoaIds = pessoas.map((p) => p.id);

    const [lancadas, previstas] = await Promise.all([
      this.repo.horasLancadasPorPessoa(pessoaIds, inicio),
      this.repo.horasPrevistasPorPessoa(pessoaIds, inicio, fim),
    ]);

    const ocupacaoEquipe = pessoas.map((p) => {
      const ocupacao = calcularOcupacao({
        horasSemanais: p.horasSemanais,
        horasLancadas: lancadas.get(p.id) ?? 0,
        horasPrevistas: previstas.get(p.id) ?? 0,
      });
      return {
        id: p.id,
        nome: p.nome,
        ocupacaoRealizada: ocupacao.realizada,
      };
    });

    // Admin: todas as horas registradas na semana. Gerente: apenas as horas dos seus projetos.
    const horasRegistradas = ehAdmin
      ? await this.repo.totalHorasLancadasNaSemana(inicio)
      : await this.repo.horasNosProjetos(projetoIds, inicio);

    const distribuicaoStatus: Record<StatusProjeto, number> = {
      NO_PRAZO: 0,
      EM_RISCO: 0,
      ATRASADO: 0,
    };
    for (const p of projetos) {
      distribuicaoStatus[p.status] += 1;
    }

    const projetosPorStatus = (Object.keys(distribuicaoStatus) as StatusProjeto[]).map(
      (status) => ({ status, quantidade: distribuicaoStatus[status] })
    );

    // Alertas: projetos atrasados ou em risco + colaboradores sobrecarregados (>= 90%)
    const alertas: Alerta[] = [
      ...this.alertasDeProjetos(projetos),
      ...ocupacaoEquipe
        .filter((p) => p.ocupacaoRealizada.rotulo === "SOBRECARREGADO")
        .map((p) => ({
          severidade: "VERMELHO" as const,
          mensagem: `${p.nome} está com ${p.ocupacaoRealizada.percentual}% de ocupação nesta semana`,
        })),
    ];

    // Ordenação: prioridade máxima (VERMELHO) no topo
    alertas.sort(porSeveridade);

    return {
      projetosAtivos: projetos.length,
      colaboradores: pessoas.length,
      horasRegistradas,
      projetosEmRisco: distribuicaoStatus.EM_RISCO,
      projetosPorStatus,
      ocupacaoEquipe,
      alertas,
    };
  }

  // Colaborador: apenas visão dos seus próprios dados e projetos alocados
  private async visaoColaborador(pessoaId: number, inicio: Date, fim: Date) {
    const [pessoa] = await this.repo.pessoasPorIds([pessoaId]);
    if (!pessoa) {
      throw new ErroHttp(404, "Pessoa não encontrada ou está inativa");
    }

    const projetos = await this.repo.projetosDaPessoa(pessoaId, inicio, fim);

    const [lancadas, previstas] = await Promise.all([
      this.repo.horasLancadasPorPessoa([pessoaId], inicio),
      this.repo.horasPrevistasPorPessoa([pessoaId], inicio, fim),
    ]);
    const horasLancadas = lancadas.get(pessoaId) ?? 0;

    const ocupacao = calcularOcupacao({
      horasSemanais: pessoa.horasSemanais,
      horasLancadas,
      horasPrevistas: previstas.get(pessoaId) ?? 0,
    });

    const alertas: Alerta[] = [
      ...(ocupacao.realizada.rotulo === "SOBRECARREGADO"
        ? [
            {
              severidade: "VERMELHO" as const,
              mensagem: `Você está com ${ocupacao.realizada.percentual}% de ocupação nesta semana`,
            },
          ]
        : []),
      ...this.alertasDeProjetos(projetos.filter((p) => p.tipo === "CLIENTE")),
    ];

    alertas.sort(porSeveridade);

    return {
      projetosAtivos: projetos.length,
      horasRegistradas: horasLancadas,
      ocupacaoRealizada: ocupacao.realizada,
      disponibilidadeRestante: ocupacao.disponibilidadeRestante,
      alertas,
    };
  }

  // Projeto atrasado vira alerta vermelho; em risco, amarelo
  private alertasDeProjetos(projetos: ProjetoResumo[]): Alerta[] {
    const alertas: Alerta[] = [];
    for (const p of projetos) {
      if (p.status === "ATRASADO") {
        alertas.push({ severidade: "VERMELHO", mensagem: `${p.nome} está atrasado` });
      } else if (p.status === "EM_RISCO") {
        alertas.push({ severidade: "AMARELO", mensagem: `${p.nome} está em risco` });
      }
    }
    return alertas;
  }
}

export const dashboardService = new DashboardService();
