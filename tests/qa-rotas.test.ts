import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app"; // Ajuste o caminho se sua pasta tests/ for mais profunda
import { pessoasRepository } from "../src/modules/pessoas/pessoas.repository";
import { sign } from "jsonwebtoken";
import { config } from "../src/lib/config";

// 1. Mock do repository para o middleware `autenticar` deixar passar (simula usuários ativos)
vi.spyOn(pessoasRepository, "encontrarAtivaPorId").mockImplementation(async (id) => {
  if (id === 1) return { id: 1, papel: "ADMIN", ativo: true } as any;
  if (id === 2) return { id: 2, papel: "GERENTE", ativo: true } as any;
  if (id === 3) return { id: 3, papel: "COLABORADOR", ativo: true } as any;
  return null;
});

// Garante que o segredo JWT exista no ambiente de teste
//process.env.JWT_SECRET = "teste-qa-secret";

function getAuth(papel: "ADMIN" | "GERENTE" | "COLABORADOR") {
  const id = papel === "ADMIN" ? 1 : papel === "GERENTE" ? 2 : 3;
  const token = sign({ id, papel }, config.JWT_SECRET);
  return `Bearer ${token}`;
}

const PAPEIS = ["ADMIN", "GERENTE", "COLABORADOR"] as const;

// 3. Corpos válidos para passar pelo Zod (middleware validar) e testar a permissão real
const payloads: Record<string, any> = {
  "post /api/projetos": { nome: "Teste", tipo: "INTERNO", horasContratadas: 10, gerenteId: 2 },
  "post /api/pessoas": { nome: "QA", email: "qa@qa.com", senha: "senha123456", papel: "COLABORADOR", horasSemanais: 40 },
  "patch /api/pessoas/1": { ativo: false },
  "patch /api/projetos/1/status": { status: "EM_RISCO", justificativa: "Atraso" },
  "post /api/projetos/1/alocacoes": { pessoaId: 3, categoriaId: 1, horasPrevistasSemana: 10, inicio: "2026-11-02" },
  "put /api/lancamentos": { semanaInicio: "2026-11-02", itens: [] }
};

describe("QA Automatizado: Matriz de Permissões das Rotas", () => {
  // Definição do que cada papel pode acessar (Baseado na Seção 8 da Arquitetura)
  const rotas = [
    { metodo: "get", url: "/api/projetos", permitidos: ["ADMIN", "GERENTE", "COLABORADOR"] },
    { metodo: "post", url: "/api/projetos", permitidos: ["ADMIN"] },
    
    { metodo: "get", url: "/api/pessoas", permitidos: ["ADMIN", "GERENTE"] },
    { metodo: "post", url: "/api/pessoas", permitidos: ["ADMIN"] },
    { metodo: "patch", url: "/api/pessoas/1", permitidos: ["ADMIN"] },
    
    // Admin apenas visualiza, quem altera é o Gerente (barrado no Service ou Middleware)
    { metodo: "patch", url: "/api/projetos/1/status", permitidos: ["GERENTE"] }, 
    
    // Alocações e remoções são feitas pelo Gerente
    { metodo: "post", url: "/api/projetos/1/alocacoes", permitidos: ["ADMIN","GERENTE"] }, 
    { metodo: "delete", url: "/api/alocacoes/1", permitidos: ["ADMIN","GERENTE"] },
    
    // Lançamento de horas: Admin não lança
    { metodo: "put", url: "/api/lancamentos", permitidos: ["GERENTE", "COLABORADOR"] }, 
    { metodo: "get", url: "/api/lancamentos", permitidos: ["ADMIN", "GERENTE", "COLABORADOR"] },
    
    // Relatórios e Dashboards: Todos acessam (o Service filtra o que cada um vê)
    { metodo: "get", url: "/api/relatorios/disponibilidade", permitidos: ["ADMIN", "GERENTE", "COLABORADOR"] },
    { metodo: "get", url: "/api/dashboard", permitidos: ["ADMIN", "GERENTE", "COLABORADOR"] },
  ];

  rotas.forEach(({ metodo, url, permitidos }) => {
    describe(`${metodo.toUpperCase()} ${url}`, () => {
      PAPEIS.forEach((papel) => {
        const devePassar = permitidos.includes(papel);

        it(`Papel ${papel} deve ser ${devePassar ? "PERMITIDO (não 403)" : "BARRADO (403)"}`, async () => {
          const body = payloads[`${metodo} ${url}`] || {};
          
          // Dispara a requisição direto contra o app
          const res = await (request(app) as any)[metodo](url)
            .set("Authorization", getAuth(papel))
            .send(body);

          if (devePassar) {
            // Se é permitido, DEVE bater no Zod ou Controller. Nunca retornar 403 Forbidden.
            // Retornar 404, 422 ou 200 é aceitável, pois prova que a camada de permissão autorizou.
            expect(res.status).not.toBe(403);
          } else {
            // Se NÃO é permitido, a rota (ou service) DEVE devolver 403
            expect(res.status).toBe(403);
          }
        });
      });
    });
  });
});