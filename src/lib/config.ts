import "dotenv-safe/config";
import { z } from "zod";

const esquema = z.object({
  DATABASE_URL: z.string().min(1),
  // Mínimo de 16 caracteres para o segredo não ser algo fraco como "secret"
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter pelo menos 16 caracteres"),
  // Validade do token em segundos (ex.: 28800) ou formato legível (ex.: "8h", "1d")
  JWT_EXPIRES: z.union([z.coerce.number().int().positive(), z.string().min(1)]).default("8h"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default("http://localhost:5173")
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  console.error("Variáveis de ambiente inválidas:", resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = resultado.data;