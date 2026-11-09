import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardService } from "../../src/modules/dashboard/dashboard.service";
import { DashboardRepository } from "../../src/modules/dashboard/dashboard.repository";

describe("DashboardService", () => {
  let repoMock: Partial<DashboardRepository>;
  let service: DashboardService;

  beforeEach(() => {
    repoMock = {
      projetosClienteAtivos: vi.fn(),
      pessoasAtivasDeTrabalho: vi.fn(),
      pessoasAlocadasNosProjetos: vi.fn(),
      pessoasPorIds: vi.fn(),
      horasLancadasPorPessoa: vi.fn(),
      horasPrevistasPorPessoa: vi.fn(),
      horasNosProjetos: vi.fn(),
      totalHorasLancadasNaSemana: vi.fn(),
      projetosDaPessoa: vi.fn(),
    };
    service = new DashboardService(repoMock as DashboardRepository);
  });

  describe("obter - visão ADMIN", () => {
    it("deve compor indicadores gerais, distribuição de status e alertas ordenados", async () => {
      vi.mocked(repoMock.projetosClienteAtivos!).mockResolvedValue([
        { id: 1, nome: "Site Institucional", status: "NO_PRAZO", tipo: "CLIENTE" },
        { id: 2, nome: "App Mobile", status: "EM_RISCO", tipo: "CLIENTE" },
        { id: 3, nome: "Portal Legado", status: "ATRASADO", tipo: "CLIENTE" },
      ] as any);

      vi.mocked(repoMock.pessoasAtivasDeTrabalho!).mockResolvedValue([
        { id: 10, nome: "Gabriela", horasSemanais: 20, papel: "GERENTE" },
        { id: 20, nome: "Ana Dev", horasSemanais: 20, papel: "COLABORADOR" },
      ] as any);

      // Ana lançou 19h de 20h (95% -> SOBRECARREGADO)
      const lancadas = new Map<number, number>([[10, 5], [20, 19]]);
      const previstas = new Map<number, number>([[10, 10], [20, 15]]);

      vi.mocked(repoMock.horasLancadasPorPessoa!).mockResolvedValue(lancadas);
      vi.mocked(repoMock.horasPrevistasPorPessoa!).mockResolvedValue(previstas);
      vi.mocked(repoMock.totalHorasLancadasNaSemana!).mockResolvedValue(24);

      const resultado = await service.obter({ id: 1, papel: "ADMIN" }, "2026-11-02");

      expect(resultado.semana).toBe("2026-11-02");
      expect(resultado).toMatchObject({
        projetosAtivos: 3,
        colaboradores: 2,
        horasRegistradas: 24,
        projetosEmRisco: 1,
      });

      expect((resultado as any).projetosPorStatus).toEqual([
        { status: "NO_PRAZO", quantidade: 1 },
        { status: "EM_RISCO", quantidade: 1 },
        { status: "ATRASADO", quantidade: 1 },
      ]);
      // Alertas ordenados com VERMELHO no topo
      const alertas = (resultado as any).alertas;
      expect(alertas[0].severidade).toBe("VERMELHO");
      expect(alertas.some((a: any) => a.mensagem === "Portal Legado está atrasado")).toBe(true);
      expect(alertas.some((a: any) => a.mensagem === "App Mobile está em risco")).toBe(true);
      expect(alertas.some((a: any) => a.mensagem.includes("Ana Dev está com 95% de ocupação"))).toBe(true);
    });
  });

  describe("obter - visão GERENTE", () => {
    it("deve restringir dados aos projetos sob sua gerência e à sua equipe", async () => {
      vi.mocked(repoMock.projetosClienteAtivos!).mockResolvedValue([
        { id: 1, nome: "Site Institucional", status: "NO_PRAZO", tipo: "CLIENTE" },
      ] as any);

      vi.mocked(repoMock.pessoasAlocadasNosProjetos!).mockResolvedValue([20]);
      vi.mocked(repoMock.pessoasPorIds!).mockResolvedValue([
        { id: 10, nome: "Gabriela", horasSemanais: 20, papel: "GERENTE" },
        { id: 20, nome: "Ana Dev", horasSemanais: 20, papel: "COLABORADOR" },
      ] as any);

      const lancadas = new Map<number, number>([[10, 4], [20, 12]]);
      const previstas = new Map<number, number>([[10, 5], [20, 12]]);

      vi.mocked(repoMock.horasLancadasPorPessoa!).mockResolvedValue(lancadas);
      vi.mocked(repoMock.horasPrevistasPorPessoa!).mockResolvedValue(previstas);
      vi.mocked(repoMock.horasNosProjetos!).mockResolvedValue(16);

      const resultado = await service.obter({ id: 10, papel: "GERENTE" }, "2026-11-02");

      expect(repoMock.projetosClienteAtivos).toHaveBeenCalledWith(10);
      expect((resultado as any).horasRegistradas).toBe(16);
      expect((resultado as any).projetosAtivos).toBe(1);
    });
  });

  describe("obter - visão COLABORADOR", () => {
    it("deve retornar métricas individuais e alertas pertinentes a ele", async () => {
      vi.mocked(repoMock.pessoasPorIds!).mockResolvedValue([
        { id: 20, nome: "Ana Dev", horasSemanais: 20, papel: "COLABORADOR" },
      ] as any);

      vi.mocked(repoMock.projetosDaPessoa!).mockResolvedValue([
        { id: 1, nome: "Site Institucional", status: "EM_RISCO", tipo: "CLIENTE" },
        { id: 9, nome: "Treinamento Interno", status: "NO_PRAZO", tipo: "INTERNO" },
      ] as any);

      // Ana lançou 18h de 20h (90% -> SOBRECARREGADO)
      const lancadas = new Map<number, number>([[20, 18]]);
      const previstas = new Map<number, number>([[20, 10]]);

      vi.mocked(repoMock.horasLancadasPorPessoa!).mockResolvedValue(lancadas);
      vi.mocked(repoMock.horasPrevistasPorPessoa!).mockResolvedValue(previstas);

      const resultado = await service.obter({ id: 20, papel: "COLABORADOR" }, "2026-11-02");

      expect(resultado).toMatchObject({
        projetosAtivos: 2,
        horasRegistradas: 18,
        ocupacaoRealizada: { percentual: 90, rotulo: "SOBRECARREGADO" },
        disponibilidadeRestante: 50,
      });

      const alertas = (resultado as any).alertas;
      expect(alertas).toEqual([
        { severidade: "VERMELHO", mensagem: "Você está com 90% de ocupação nesta semana" },
        { severidade: "AMARELO", mensagem: "Site Institucional está em risco" },
      ]);
    });
  });
});
