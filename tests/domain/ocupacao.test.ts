import { describe, it, expect } from "vitest";
import {
  calcularOcupacao,
  classificarOcupacao,
  calcularPercentual,
} from "../../src/domain/ocupacao";
import { ErroDominio } from "../../src/domain/erros";

describe("Domain: ocupacao", () => {
  it("deve classificar os rótulos de ocupação conforme as faixas da arquitetura", () => {
    expect(classificarOcupacao(90)).toBe("SOBRECARREGADO");
    expect(classificarOcupacao(95)).toBe("SOBRECARREGADO");
    expect(classificarOcupacao(50)).toBe("NORMAL");
    expect(classificarOcupacao(89.9)).toBe("NORMAL");
    expect(classificarOcupacao(49.9)).toBe("DISPONIVEL");
    expect(classificarOcupacao(0)).toBe("DISPONIVEL");
  });

  it("deve classificar pelo valor sem arredondar: 35.99 h de 40 h (89.975%) aparece como 90 mas permanece NORMAL", () => {
    const resultado = calcularOcupacao({
      horasSemanais: 40,
      horasLancadas: 35.99,
      horasPrevistas: 20,
    });

    expect(resultado.realizada.percentual).toBe(90);
    expect(resultado.realizada.rotulo).toBe("NORMAL");
  });

  it("deve calcular taxas realizada e planejada, horas livres e disponibilidade restante", () => {
    // Ana: 40h semanais, 36h lançadas (90%), 20h previstas (50%)
    const resultado = calcularOcupacao({
      horasSemanais: 40,
      horasLancadas: 36,
      horasPrevistas: 20,
    });

    expect(resultado.realizada.percentual).toBe(90);
    expect(resultado.realizada.rotulo).toBe("SOBRECARREGADO");

    expect(resultado.planejada.percentual).toBe(50);
    expect(resultado.planejada.rotulo).toBe("NORMAL");

    expect(resultado.horasLivres).toBe(20);
    expect(resultado.disponibilidadeRestante).toBe(50);
  });

  it("deve lançar ErroDominio se base de horas for zero ou negativa", () => {
    expect(() => calcularPercentual(10, 0)).toThrow(ErroDominio);
    expect(() => calcularPercentual(10, -5)).toThrow(ErroDominio);
    expect(() => calcularPercentual(-2, 40)).toThrow(ErroDominio);
  });
});

