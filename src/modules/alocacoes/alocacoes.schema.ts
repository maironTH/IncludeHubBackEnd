// src/modules/alocacoes/alocacoes.schema.ts
import { z } from "zod";

export const criarAlocacaoNoProjetoSchema = z.object({
  pessoaId: z.number().int().positive("pessoaId deve ser um número inteiro positivo"),
  categoriaId: z.number().int().positive("categoriaId deve ser um número inteiro positivo"),
  horasPrevistasSemana: z.number().positive("horasPrevistasSemana deve ser um número positivo maior que zero"),
  inicio: z.string().optional(), // formato YYYY-MM-DD ou ISO
  fim: z.string().optional().nullable(),
});

export type CriarAlocacaoNoProjetoInput = z.infer<typeof criarAlocacaoNoProjetoSchema>;

// Mantém suporte para payload com projetoId explícito se necessário
export const criarAlocacaoSchema = criarAlocacaoNoProjetoSchema.extend({
  projetoId: z.number().int().positive("projetoId deve ser um número inteiro positivo"),
});

export type CriarAlocacaoInput = z.infer<typeof criarAlocacaoSchema>;

export const listarAlocacoesQuerySchema = z.object({
  projetoId: z.coerce.number().int().positive().optional(),
  pessoaId: z.coerce.number().int().positive().optional(),
});

export type ListarAlocacoesQuery = z.infer<typeof listarAlocacoesQuerySchema>;

export const minhasAlocacoesQuerySchema = z.object({
  semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "semana deve estar no formato AAAA-MM-DD").optional(),
});

export type MinhasAlocacoesQuery = z.infer<typeof minhasAlocacoesQuerySchema>;