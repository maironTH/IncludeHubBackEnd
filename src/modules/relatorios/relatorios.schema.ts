import { z } from "zod";

export const relatorioDisponibilidadeQuerySchema = z.object({
  semana: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
    .optional(),
});