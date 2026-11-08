// tests/domain/semana.test.ts
import { describe, it, expect } from "vitest";
import { segundaDaSemana, semanaAtual, ehSegunda, somarSemanas, domingoDaSemana } from "../../src/domain/semana";

describe("Cálculos Puros de Domínio - Semana", () => {
  it("deve retornar a própria segunda-feira quando a data já for uma segunda", () => {
    const segunda = new Date("2026-11-09T14:30:00.000Z");
    const resultado = segundaDaSemana(segunda);
    expect(resultado.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(ehSegunda(resultado)).toBe(true);
  });

  it("deve retornar a segunda-feira anterior ao receber uma quarta-feira", () => {
    const quarta = new Date("2026-11-11T18:00:00.000Z");
    const resultado = segundaDaSemana(quarta);
    expect(resultado.toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });

  it("deve retornar a segunda-feira anterior ao receber um domingo", () => {
    // Domingo 15/11/2026 fecha a semana que começou em 09/11/2026
    const domingo = new Date("2026-11-15T23:59:59.000Z");
    const resultado = segundaDaSemana(domingo);
    expect(resultado.toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });

  it("deve calcular corretamente na virada de ano", () => {
    // 01/01/2027 (sexta-feira) pertence à semana iniciada em 28/12/2026
    const anoNovo = new Date("2027-01-01T10:00:00.000Z");
    const resultado = segundaDaSemana(anoNovo);
    expect(resultado.toISOString()).toBe("2026-12-28T00:00:00.000Z");
  });

  it("deve garantir que o resultado tenha hora 00:00:00.000 UTC", () => {
    const dataQualquer = new Date("2026-11-12T19:42:15.823Z");
    const resultado = segundaDaSemana(dataQualquer);
    expect(resultado.getUTCHours()).toBe(0);
    expect(resultado.getUTCMinutes()).toBe(0);
    expect(resultado.getUTCSeconds()).toBe(0);
    expect(resultado.getUTCMilliseconds()).toBe(0);
  });

  it("deve calcular a semanaAtual a partir da data de referência", () => {
    const hojeMock = new Date("2026-11-13T12:00:00.000Z"); // Sexta-feira
    const resultado = semanaAtual(hojeMock);
    expect(resultado.toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });

  it("deve somar semanas corretamente a partir de uma segunda-feira", () => {
    const segunda = segundaDaSemana(new Date("2026-11-09T00:00:00.000Z"));
    const proximaSegunda = somarSemanas(segunda, 1);
    expect(proximaSegunda.toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });

  it("deve calcular o domingo correspondente à semana", () => {
    const quarta = new Date("2026-11-11T00:00:00.000Z");
    const domingo = domingoDaSemana(quarta);
    expect(domingo.toISOString()).toBe("2026-11-15T00:00:00.000Z");
  });
});