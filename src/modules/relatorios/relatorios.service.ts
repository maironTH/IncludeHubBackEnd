import { calcularOcupacao } from "../../domain/ocupacao";
import { segundaDaSemana, domingoDaSemana, formatarDataISO, parseDataISO } from "../../domain/semana";
import { ErroHttp } from "../../lib/erros";
import type { UsuarioLogado } from "../pessoas/pessoas.service";
import { relatoriosRepository, RelatoriosRepository } from "./relatorios.repository";

export class RelatoriosService {
  constructor(private repo: RelatoriosRepository = relatoriosRepository) {}

  async disponibilidade(usuario: UsuarioLogado, semanaParam?: string) {
    // Semana pedida ou atual, sempre normalizada para a segunda-feira em UTC
    const inicio = segundaDaSemana(semanaParam ? parseDataISO(semanaParam) : new Date());
    const fim = domingoDaSemana(inicio);

    const pessoas = await this.pessoasVisiveis(usuario, inicio, fim);
    const ids = pessoas.map((p) => p.id);

    const [lancadas, alocacoes] = await Promise.all([
      this.repo.horasLancadasPorPessoa(ids, inicio),
      this.repo.alocacoesVigentes(ids, inicio, fim),
    ]);

    const itens = pessoas.map((p) => {
      const alocacao = alocacoes.get(p.id);
      const ocupacao = calcularOcupacao({
        horasSemanais: p.horasSemanais,
        horasLancadas: lancadas.get(p.id) ?? 0,
        horasPrevistas: alocacao?.horasPrevistas ?? 0,
      });
      return {
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        horasSemanais: p.horasSemanais,
        projetosAtuais: alocacao?.projetos ?? 0,
        ocupacaoRealizada: ocupacao.realizada,
        ocupacaoPlanejada: ocupacao.planejada,
        horasLivres: ocupacao.horasLivres,
        disponibilidadeRestante: ocupacao.disponibilidadeRestante,
      };
    });

    return { semana: formatarDataISO(inicio), pessoas: itens };
  }

  // Admin: todos Gerente: equipe Colaborador: só ele.
  private async pessoasVisiveis(usuario: UsuarioLogado, inicio: Date, fim: Date) {
    if (usuario.papel === "ADMIN") {
      return this.repo.pessoasDeTrabalho();
    }
    if (usuario.papel === "GERENTE") {
      const equipe = await this.repo.idsDaEquipeDoGerente(usuario.id, inicio, fim);
      return this.repo.pessoasPorIds([...new Set([...equipe, usuario.id])]);
    }
    const propria = await this.repo.pessoasPorIds([usuario.id]);
    if (propria.length === 0) {
      throw new ErroHttp(404, "Pessoa não encontrada ou está inativa");
    }
    return propria;
  }
}

export const relatoriosService = new RelatoriosService();