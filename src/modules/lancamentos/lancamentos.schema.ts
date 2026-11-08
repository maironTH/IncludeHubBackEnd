// src/modules/lancamentos/lancamentos.schema.ts
import { z } from "zod";

// Schema para os parâmetros de busca do GET /api/lancamentos
export const listarLancamentosQuerySchema = z.object({
  semanaInicio: z.coerce.date().optional(),
  projetoId: z.coerce.number().int().positive("projetoId deve ser um número positivo").optional(),
  pessoaId: z.coerce.number().int().positive("pessoaId deve ser um número positivo").optional(),
});

export type ListarLancamentosQuery = z.infer<typeof listarLancamentosQuerySchema>;

// Item individual do Batch Upsert
export const itemLancamentoSchema = z.object({
  pessoaId: z.any().optional(), // ignorado no service se vier, por segurança
  projetoId: z.coerce.number().int().positive("projetoId deve ser um número positivo"),
  horas: z.coerce
    .number()
    .min(0, "Horas não podem ser negativas")
    .max(168, "Horas não podem exceder 168")
    .multipleOf(0.25, "Horas devem ser múltiplos de 0.25 (ex: 0.5, 1.25, 4.0)"),
  descricao: z
    .string()
    .trim()
    .max(500, "A descrição deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
});

// Schema para o corpo do PUT /api/lancamentos
export const salvarLancamentosSchema = z.object({
  pessoaId: z.any().optional(), // caso o front envie no nível raiz, é ignorado com segurança
  semanaInicio: z.coerce.date({
    message: "A data da semana (semanaInicio) é obrigatória",
  }),
  itens: z
    .array(itemLancamentoSchema)
    .min(1, "A lista de lançamentos deve conter ao menos 1 item")
    .max(50, "A lista de lançamentos não pode conter mais de 50 itens")
    .refine(
      (itens) => {
        const ids = itens.map((item) => item.projetoId);
        return new Set(ids).size === ids.length;
      },
      {
        message:
          "Não é permitido enviar múltiplos lançamentos para o mesmo projeto na mesma semana",
        path: ["itens"],
      }
    ),
});


export type SalvarLancamentosInput = z.infer<typeof salvarLancamentosSchema>;