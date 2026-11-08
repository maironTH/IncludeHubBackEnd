import { z } from "zod";

export const dashboardQuerySchema = z.object({
  periodo: z.enum(["semana"]).default("semana").optional(),
  semana: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "semana deve estar no formato AAAA-MM-DD")
    .optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;