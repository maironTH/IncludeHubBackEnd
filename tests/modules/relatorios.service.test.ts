import { describe, it, expect, vi } from "vitest";
import { RelatoriosService } from "../../src/modules/relatorios/relatorios.service";

const ana = { id: 3, nome: "Ana", horasSemanais: 40, categoria: { id: 2, nome: "Desenvolvedor" } };

function criarRepoMock() {
  return {
    pessoasDeTrabalho: vi.fn().mockResolvedValue([ana]),
    pessoasPorIds: vi.fn().mockResolvedValue([ana]),
    idsDaEquipeDoGerente: vi.fn().mockResolvedValue([3]),
    horasLancadasPorPessoa: vi.fn().mockResolvedValue(new Map([[3, 36]])),
    alocacoesVigentes: vi.fn().mockResolvedValue(new Map([[3, { horasPrevistas: 20, projetos: 2 }]])),
  };
}

describe("RelatoriosService.disponibilidade", () => {
  it("ADMIN vê todos e recebe as duas ocupações", async () => {
    const service = new RelatoriosService(criarRepoMock() as any);
    const r = await service.disponibilidade({ id: 1, papel: "ADMIN" }, "2026-11-04");

    expect(r.semana).toBe("2026-11-02"); // normalizada para a segunda
    expect(r.pessoas[0]).toMatchObject({
      id: 3,
      projetosAtuais: 2,
      ocupacaoRealizada: { percentual: 90, rotulo: "SOBRECARREGADO" },
      ocupacaoPlanejada: { percentual: 50, rotulo: "NORMAL" },
      horasLivres: 20,
      disponibilidadeRestante: 50,
    });
  });

  it("GERENTE vê a equipe mais ele mesmo", async () => {
    const repo = criarRepoMock();
    await new RelatoriosService(repo as any).disponibilidade({ id: 10, papel: "GERENTE" }, "2026-11-02");

    expect(repo.idsDaEquipeDoGerente).toHaveBeenCalledWith(10, expect.any(Date), expect.any(Date));
    expect(repo.pessoasPorIds).toHaveBeenCalledWith([3, 10]);
  });

  it("COLABORADOR vê só a própria", async () => {
    const repo = criarRepoMock();
    await new RelatoriosService(repo as any).disponibilidade({ id: 3, papel: "COLABORADOR" });

    expect(repo.pessoasPorIds).toHaveBeenCalledWith([3]);
    expect(repo.pessoasDeTrabalho).not.toHaveBeenCalled();
    expect(repo.idsDaEquipeDoGerente).not.toHaveBeenCalled();
  });
});