// src/modules/alocacoes/alocacoes.schema.ts
import { z } from "zod";

export const criarAlocacaoSchema = z.object({
  pessoaId: z.number().int().positive("pessoaId deve ser um número inteiro positivo"),
  projetoId: z.number().int().positive("projetoId deve ser um número inteiro positivo"),
  categoriaId: z.number().int().positive("categoriaId deve ser um número inteiro positivo"),
  horasPrevistasSemana: z.number().nonnegative("horasPrevistasSemana não pode ser negativa"),
  inicio: z.string().optional(), // formato YYYY-MM-DD ou ISO
  fim: z.string().optional().nullable(),
});

export type CriarAlocacaoInput = z.infer<typeof criarAlocacaoSchema>;

export const listarAlocacoesQuerySchema = z.object({
  projetoId: z.coerce.number().int().positive().optional(),
  pessoaId: z.coerce.number().int().positive().optional(),
});

export type ListarAlocacoesQuery = z.infer<typeof listarAlocacoesQuerySchema>;