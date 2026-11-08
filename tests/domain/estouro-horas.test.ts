import { describe, it, expect } from "vitest";
import { calcularEstouro, classificarEstouro } from "../../src/domain/estouro-horas";
import { ErroDominio } from "../../src/domain/erros";

describe("Domain: estouro-horas", () => {
  it("deve classificar conforme faixas: OK (< 80%), ATENCAO (80% a 100%), ESTOURADO (> 100%)", () => {
    expect(classificarEstouro(79.9)).toBe("OK");
    expect(classificarEstouro(80)).toBe("ATENCAO");
    expect(classificarEstouro(100)).toBe("ATENCAO");
    expect(classificarEstouro(100.1)).toBe("ESTOURADO");
  });

  it("deve retornar null para projetos internos", () => {
    const resultado = calcularEstouro({
      tipo: "INTERNO",
      horasLancadas: 50,
      horasContratadas: null,
    });
    expect(resultado).toBeNull();
  });

  it("deve calcular percentual e rótulo para projeto de cliente", () => {
    const resultado = calcularEstouro({
      tipo: "CLIENTE",
      horasLancadas: 380,
      horasContratadas: 500,
    });

    expect(resultado).not.toBeNull();
    expect(resultado?.percentual).toBe(76);
    expect(resultado?.rotulo).toBe("OK");
  });

  it("deve lançar ErroDominio se horas lançadas forem negativas", () => {
    expect(() =>
      calcularEstouro({
        tipo: "CLIENTE",
        horasLancadas: -10,
        horasContratadas: 100,
      })
    ).toThrow(ErroDominio);
  });
});

