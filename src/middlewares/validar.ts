import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validar(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          erro: "Dados inválidos",
          detalhes: error.issues.map((issue) => ({
            campo: issue.path.join("."),
            mensagem: issue.message,
          })),
        });
      }
      return res.status(500).json({ erro: "Erro interno na validação" });
    }
  };
}