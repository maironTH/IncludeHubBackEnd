import { z } from "zod";

export const criarPessoaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail em formato inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  papel: z.enum(["ADMIN", "GERENTE", "COLABORADOR"]),
  horasSemanais: z.number().int().positive("Horas semanais devem ser um número positivo"),
  categoriaId: z.number().int().positive().optional(),
});

export const atualizarPessoaSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  papel: z.enum(["ADMIN", "GERENTE", "COLABORADOR"]).optional(),
  horasSemanais: z.number().int().positive().optional(),
  categoriaId: z.number().int().positive().nullable().optional(),
  ativo: z.boolean().optional(),
});

export type CriarPessoaInput = z.infer<typeof criarPessoaSchema>;
export type AtualizarPessoaInput = z.infer<typeof atualizarPessoaSchema>;

export const listarPessoasQuerySchema = z.object({
  papel: z.enum(["ADMIN", "GERENTE", "COLABORADOR"]).optional(),
  situacao: z.enum(["ativas", "inativas", "todas"]).default("ativas"),
});

export type ListarPessoasQuery = z.infer<typeof listarPessoasQuerySchema>;
