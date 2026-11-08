import { describe, it, expect } from "vitest";
import {
  parseDataISO,
  formatarDataISO,
  segundaDaSemana,
  domingoDaSemana,
  somarSemanas,
  ehSegunda,
} from "../../src/domain/semana";
import { ErroDominio } from "../../src/domain/erros";

describe("Domain: semana", () => {
  it("deve converter e validar data em formato ISO AAAA-MM-DD em UTC", () => {
    const data = parseDataISO("2026-11-02");
    expect(data.getUTCFullYear()).toBe(2026);
    expect(data.getUTCMonth()).toBe(10); // Novembro (0-indexed)
    expect(data.getUTCDate()).toBe(2);
    expect(formatarDataISO(data)).toBe("2026-11-02");
  });

  it("deve lançar ErroDominio para formato ou dia inválido", () => {
    expect(() => parseDataISO("02/11/2026")).toThrow(ErroDominio);
    expect(() => parseDataISO("2026-02-30")).toThrow(ErroDominio);
  });

  it("deve calcular a segunda-feira da semana de uma data", () => {
    // Quarta-feira 04/11/2026 -> Segunda 02/11/2026
    const quarta = parseDataISO("2026-11-04");
    const segunda = segundaDaSemana(quarta);
    expect(formatarDataISO(segunda)).toBe("2026-11-02");
    expect(ehSegunda(segunda)).toBe(true);

    // Domingo 08/11/2026 pertence à semana que inicia em 02/11/2026
    const domingo = parseDataISO("2026-11-08");
    expect(formatarDataISO(segundaDaSemana(domingo))).toBe("2026-11-02");
  });

  it("deve calcular o domingo da semana", () => {
    const quarta = parseDataISO("2026-11-04");
    const domingo = domingoDaSemana(quarta);
    expect(formatarDataISO(domingo)).toBe("2026-11-08");
  });

  it("deve somar semanas corretamente", () => {
    const segunda = segundaDaSemana(parseDataISO("2026-11-02"));
    const proxima = somarSemanas(segunda, 1);
    expect(formatarDataISO(proxima)).toBe("2026-11-09");
  });
});

