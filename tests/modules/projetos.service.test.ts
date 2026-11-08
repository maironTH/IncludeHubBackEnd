import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjetosService } from "../../src/modules/projetos/projetos.service";
import { ProjetosRepository } from "../../src/modules/projetos/projetos.repository";
import { PessoasRepository } from "../../src/modules/pessoas/pessoas.repository";
import { ErroHttp } from "../../src/lib/erros";

describe("ProjetosService", () => {
  let repoMock: Partial<ProjetosRepository>;
  let pessoasRepoMock: Partial<PessoasRepository>;
  let service: ProjetosService;

  beforeEach(() => {
    repoMock = {
      listar: vi.fn(),
      encontrarPorId: vi.fn(),
      criar: vi.fn(),
      atualizar: vi.fn(),
      inativar: vi.fn(),
      atualizarStatus: vi.fn(),
      listarHistorico: vi.fn(),
      usuarioEstaAlocado: vi.fn(),
    };
    pessoasRepoMock = {
      encontrarAtivaPorId: vi.fn(),
    };
    service = new ProjetosService(
      repoMock as ProjetosRepository,
      pessoasRepoMock as PessoasRepository
    );
  });

  describe("criarProjeto", () => {
    it("deve criar projeto e gravar primeira linha no histórico com ID do usuário logado", async () => {
      vi.mocked(pessoasRepoMock.encontrarAtivaPorId!).mockResolvedValue({
        id: 4,
        nome: "Beto",
        papel: "GERENTE",
        ativo: true,
      } as any);

      vi.mocked(repoMock.criar!).mockResolvedValue({
        id: 1,
        nome: "Site Institucional",
        tipo: "CLIENTE",
        status: "NO_PRAZO",
      } as any);

      const resultado = await service.criarProjeto(
        {
          nome: "Site Institucional",
          tipo: "CLIENTE",
          cliente: "Empresa X",
          horasContratadas: 200,
          gerenteId: 4,
        },
        { id: 1, papel: "ADMIN" }
      );

      expect(resultado.status).toBe("NO_PRAZO");
      expect(repoMock.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Site Institucional",
          status: "NO_PRAZO",
        }),
        1 // alteradoPorId
      );
    });

    it("deve validar campos obrigatórios para projeto do tipo CLIENTE", async () => {
      await expect(
        service.criarProjeto(
          {
            nome: "Projeto sem cliente",
            tipo: "CLIENTE",
          },
          { id: 1, papel: "ADMIN" }
        )
      ).rejects.toThrow("Cliente é obrigatório para projetos do tipo CLIENTE");
    });
  });

  describe("alterarStatus", () => {
    it("deve barrar ADMIN tentando alterar status (apenas GERENTE responsável)", async () => {
      vi.mocked(repoMock.encontrarPorId!).mockResolvedValue({
        id: 1,
        gerenteId: 4,
        ativo: true,
      } as any);

      await expect(
        service.alterarStatus(
          1,
          { status: "EM_RISCO", justificativa: "Risco de prazo" },
          { id: 1, papel: "ADMIN" }
        )
      ).rejects.toThrow("Apenas o gerente responsável pode alterar a saúde deste projeto");
    });

    it("deve barrar GERENTE alterando status de projeto de outro gerente", async () => {
      vi.mocked(repoMock.encontrarPorId!).mockResolvedValue({
        id: 1,
        gerenteId: 4,
        ativo: true,
      } as any);

      await expect(
        service.alterarStatus(
          1,
          { status: "EM_RISCO" },
          { id: 99, papel: "GERENTE" }
        )
      ).rejects.toThrow("Apenas o gerente responsável pode alterar a saúde deste projeto");
    });

    it("deve exigir justificativa quando status for ATRASADO", async () => {
      vi.mocked(repoMock.encontrarPorId!).mockResolvedValue({
        id: 1,
        gerenteId: 4,
        ativo: true,
      } as any);

      await expect(
        service.alterarStatus(
          1,
          { status: "ATRASADO" },
          { id: 4, papel: "GERENTE" }
        )
      ).rejects.toThrow("A justificativa é obrigatória quando o status for ATRASADO");
    });

    it("deve permitir que o gerente do projeto altere a saúde com sucesso", async () => {
      vi.mocked(repoMock.encontrarPorId!).mockResolvedValue({
        id: 1,
        gerenteId: 4,
        ativo: true,
      } as any);
      vi.mocked(repoMock.atualizarStatus!).mockResolvedValue({
        id: 1,
        status: "EM_RISCO",
      } as any);

      await service.alterarStatus(
        1,
        { status: "EM_RISCO", justificativa: "Cliente atrasou envio" },
        { id: 4, papel: "GERENTE" }
      );

      expect(repoMock.atualizarStatus).toHaveBeenCalledWith(
        1,
        "EM_RISCO",
        "Cliente atrasou envio",
        4
      );
    });
  });

  describe("listarProjetos - visibilidade", () => {
    it("deve incluir projetos internos e alocados para COLABORADOR", async () => {
      await service.listarProjetos({ id: 5, papel: "COLABORADOR" }, {});
      expect(repoMock.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          colaboradorPessoaId: 5,
        })
      );
    });

    it("deve filtrar por gerenteId para GERENTE", async () => {
      await service.listarProjetos({ id: 4, papel: "GERENTE" }, {});
      expect(repoMock.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          gerenteId: 4,
        })
      );
    });
  });
});

