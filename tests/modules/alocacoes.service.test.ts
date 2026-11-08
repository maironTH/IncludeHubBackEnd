import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlocacoesService } from "../../src/modules/alocacoes/alocacoes.service";
import { AlocacoesRepository } from "../../src/modules/alocacoes/alocacoes.repository";
import { ErroHttp } from "../../src/lib/erros";
import { Decimal } from "@prisma/client/runtime/library";

describe("AlocacoesService", () => {
  let repoMock: Partial<AlocacoesRepository>;
  let service: AlocacoesService;

  beforeEach(() => {
    repoMock = {
      buscarPessoaAtiva: vi.fn(),
      buscarProjetoAtivo: vi.fn(),
      buscarCategoria: vi.fn(),
      buscarAlocacoesDaPessoa: vi.fn(),
      buscarAlocacoesVigentesNaSemana: vi.fn(),
      buscarProjetosInternosAtivos: vi.fn(),
      buscarProjetosGerenciadosAtivos: vi.fn(),
      buscarPorId: vi.fn(),
      criar: vi.fn(),
      deletar: vi.fn(),
      listarPorProjeto: vi.fn(),
      listar: vi.fn(),
    };
    service = new AlocacoesService(repoMock as AlocacoesRepository);
  });

  describe("criarNoProjeto", () => {
    it("deve barrar gerente alocando em projeto que não gerencia (403)", async () => {
      vi.mocked(repoMock.buscarProjetoAtivo!).mockResolvedValue({
        id: 1,
        nome: "Projeto A",
        gerenteId: 99,
        ativo: true,
      } as any);

      await expect(
        service.criarNoProjeto(
          { id: 10, papel: "GERENTE" },
          1,
          { pessoaId: 2, categoriaId: 1, horasPrevistasSemana: 20 }
        )
      ).rejects.toThrow(ErroHttp);
    });

    it("deve rejeitar se colaborador já possui alocação no mesmo projeto no período (422)", async () => {
      vi.mocked(repoMock.buscarProjetoAtivo!).mockResolvedValue({
        id: 1,
        nome: "Projeto A",
        gerenteId: 10,
        ativo: true,
      } as any);
      vi.mocked(repoMock.buscarPessoaAtiva!).mockResolvedValue({
        id: 2,
        nome: "Colaborador",
        horasSemanais: 40,
        ativo: true,
      } as any);
      vi.mocked(repoMock.buscarCategoria!).mockResolvedValue({ id: 1, nome: "Dev" } as any);

      vi.mocked(repoMock.buscarAlocacoesDaPessoa!).mockResolvedValue([
        {
          id: 101,
          pessoaId: 2,
          projetoId: 1, // mesmo projeto
          horasPrevistasSemana: new Decimal(20),
          inicio: new Date("2026-11-01T00:00:00.000Z"),
          fim: new Date("2026-11-30T00:00:00.000Z"),
        } as any,
      ]);

      await expect(
        service.criarNoProjeto(
          { id: 10, papel: "GERENTE" },
          1,
          {
            pessoaId: 2,
            categoriaId: 1,
            horasPrevistasSemana: 10,
            inicio: "2026-11-10",
            fim: "2026-11-20",
          }
        )
      ).rejects.toThrow("Colaborador já possui alocação neste projeto no período informado");
    });

    it("deve barrar por capacidade se total de horas exceder horasSemanais (422 com mensagem da arquitetura)", async () => {
      vi.mocked(repoMock.buscarProjetoAtivo!).mockResolvedValue({
        id: 2,
        nome: "Projeto B",
        gerenteId: 10,
        ativo: true,
      } as any);
      vi.mocked(repoMock.buscarPessoaAtiva!).mockResolvedValue({
        id: 2,
        nome: "Ana",
        horasSemanais: 40,
        ativo: true,
      } as any);
      vi.mocked(repoMock.buscarCategoria!).mockResolvedValue({ id: 1, nome: "Dev" } as any);

      // Ana já tem 30h alocadas no Projeto 1
      vi.mocked(repoMock.buscarAlocacoesDaPessoa!).mockResolvedValue([
        {
          id: 101,
          pessoaId: 2,
          projetoId: 1,
          horasPrevistasSemana: new Decimal(30),
          inicio: new Date("2026-11-01T00:00:00.000Z"),
          fim: new Date("2026-11-30T00:00:00.000Z"),
        } as any,
      ]);

      // Tenta alocar mais 15h -> 30 + 15 = 45 > 40
      await expect(
        service.criarNoProjeto(
          { id: 10, papel: "GERENTE" },
          2,
          {
            pessoaId: 2,
            categoriaId: 1,
            horasPrevistasSemana: 15,
            inicio: "2026-11-02",
            fim: "2026-11-15",
          }
        )
      ).rejects.toThrow("Pessoa já tem 30 h alocadas de 40 h");
    });

    it("deve permitir alocação quando houver capacidade disponível", async () => {
      vi.mocked(repoMock.buscarProjetoAtivo!).mockResolvedValue({
        id: 2,
        nome: "Projeto B",
        gerenteId: 10,
        ativo: true,
      } as any);
      vi.mocked(repoMock.buscarPessoaAtiva!).mockResolvedValue({
        id: 2,
        nome: "Ana",
        horasSemanais: 40,
        ativo: true,
      } as any);
      vi.mocked(repoMock.buscarCategoria!).mockResolvedValue({ id: 1, nome: "Dev" } as any);

      vi.mocked(repoMock.buscarAlocacoesDaPessoa!).mockResolvedValue([
        {
          id: 101,
          pessoaId: 2,
          projetoId: 1,
          horasPrevistasSemana: new Decimal(20),
          inicio: new Date("2026-11-01T00:00:00.000Z"),
          fim: new Date("2026-11-30T00:00:00.000Z"),
        } as any,
      ]);

      vi.mocked(repoMock.criar!).mockResolvedValue({
        id: 102,
        pessoaId: 2,
        projetoId: 2,
        categoriaId: 1,
        horasPrevistasSemana: new Decimal(15),
        inicio: new Date("2026-11-02T00:00:00.000Z"),
        fim: null,
      } as any);

      const resultado = await service.criarNoProjeto(
        { id: 10, papel: "GERENTE" },
        2,
        {
          pessoaId: 2,
          categoriaId: 1,
          horasPrevistasSemana: 15,
          inicio: "2026-11-02",
        }
      );

      expect(resultado.horasPrevistasSemana).toBe(15);
      expect(repoMock.criar).toHaveBeenCalled();
    });
  });

  describe("minhas", () => {
    it("deve retornar projetos da semana com horas numéricas e projetos internos com null", async () => {
      vi.mocked(repoMock.buscarAlocacoesVigentesNaSemana!).mockResolvedValue([
        {
          id: 1,
          horasPrevistasSemana: new Decimal(20),
          projeto: { id: 1, nome: "Site Institucional", tipo: "CLIENTE" },
        } as any,
      ]);

      vi.mocked(repoMock.buscarProjetosInternosAtivos!).mockResolvedValue([
        { id: 9, nome: "Reunião", tipo: "INTERNO" } as any,
      ]);

      const resultado = await service.minhas(
        { id: 3, papel: "COLABORADOR" },
        "2026-11-02"
      );

      expect(resultado.semana).toBe("2026-11-02");
      expect(resultado.projetos).toEqual([
        { id: 1, nome: "Site Institucional", tipo: "CLIENTE", horasPrevistasSemana: 20 },
        { id: 9, nome: "Reunião", tipo: "INTERNO", horasPrevistasSemana: null },
      ]);
    });
  });

  describe("remover", () => {
    it("deve barrar gerente tentando remover alocação de projeto alheio (403)", async () => {
      vi.mocked(repoMock.buscarPorId!).mockResolvedValue({
        id: 5,
        projeto: { id: 1, gerenteId: 99 },
      } as any);

      await expect(
        service.remover({ id: 10, papel: "GERENTE" }, 5)
      ).rejects.toThrow("Você só pode remover alocações de projetos sob sua gerência");
    });

    it("deve permitir admin remover qualquer alocação", async () => {
      vi.mocked(repoMock.buscarPorId!).mockResolvedValue({
        id: 5,
        projeto: { id: 1, gerenteId: 99 },
      } as any);

      await service.remover({ id: 1, papel: "ADMIN" }, 5);
      expect(repoMock.deletar).toHaveBeenCalledWith(5);
    });
  });
});

