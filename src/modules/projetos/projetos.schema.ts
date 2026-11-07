import { z } from "zod";

const tipoProjetoEnum = z.enum(["CLIENTE", "INTERNO"]);
const statusProjetoEnum = z.enum(["NO_PRAZO", "EM_RISCO", "ATRASADO"]);

// Base para reutilizar no partial de atualização
const baseProjetoSchema = z.object({
  nome: z.string().trim().min(1, "O nome do projeto é obrigatório"),
  tipo: tipoProjetoEnum,
  cliente: z.string().trim().min(1, "O nome do cliente é obrigatório para projetos de clientes").optional().nullable(),
  gerenteId: z.number().int().positive("gerenteId deve ser um número inteiro positivo").optional().nullable(),
  horasContratadas: z.number().int().positive("Horas contratadas devem ser um número positivo").optional().nullable(),
  inicio: z.coerce.date().optional().nullable(),
  fimPrevisto: z.coerce.date().optional().nullable(),
});

// 1. Schema de Criação com regras condicionais
export const criarProjetoSchema = baseProjetoSchema.superRefine((dados, ctx) => {
  // Se for projeto de cliente, exige cliente, horas contratadas e gerente
  if (dados.tipo === "CLIENTE") {
    if (!dados.cliente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O campo cliente é obrigatório para projetos do tipo CLIENTE",
        path: ["cliente"],
      });
    }
    if (!dados.horasContratadas || dados.horasContratadas <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Horas contratadas são obrigatórias e devem ser maiores que zero para projetos CLIENTE",
        path: ["horasContratadas"],
      });
    }
    if (!dados.gerenteId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O gerenteId é obrigatório para projetos do tipo CLIENTE",
        path: ["gerenteId"],
      });
    }
  }

  // Validação de intervalo de datas
  if (dados.inicio && dados.fimPrevisto && dados.fimPrevisto < dados.inicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A data de fim previsto não pode ser anterior à data de início",
      path: ["fimPrevisto"],
    });
  }
});

export type CriarProjetoInput = z.infer<typeof criarProjetoSchema>;

// 2. Schema de Atualização (não aceita 'status' diretamente)
export const atualizarProjetoSchema = baseProjetoSchema
  .partial()
  .extend({
    ativo: z.boolean().optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.inicio && dados.fimPrevisto && dados.fimPrevisto < dados.inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data de fim previsto não pode ser anterior à data de início",
        path: ["fimPrevisto"],
      });
    }
  });

export type AtualizarProjetoInput = z.infer<typeof atualizarProjetoSchema>;

// 3. Schema para Query da Listagem
export const listarProjetosQuerySchema = z.object({
  nome: z.string().optional(),
  cliente: z.string().optional(),
  status: statusProjetoEnum.optional(),
  tipo: tipoProjetoEnum.optional(),
  gerenteId: z.coerce.number().int().positive().optional(),
});

export type ListarProjetosQuery = z.infer<typeof listarProjetosQuerySchema>;

// 4. Schema para Alteração de Saúde / Status
export const alterarStatusSchema = z
  .object({
    status: statusProjetoEnum,
    justificativa: z.string().max(500, "A justificativa deve ter no máximo 500 caracteres").optional().nullable(),
  })
  .superRefine((dados, ctx) => {
    // Se o status for ATRASADO, a justificativa é obrigatória (Cenário 13 do checklist)
    if (dados.status === "ATRASADO" && (!dados.justificativa || dados.justificativa.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A justificativa é obrigatória quando o status do projeto for ATRASADO",
        path: ["justificativa"],
      });
    }
  });

export type AlterarStatusInput = z.infer<typeof alterarStatusSchema>;