import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validar(
  schema: ZodSchema,
  origem: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosValidados = schema.parse(req[origem]);

      if (origem === "query") {
        res.locals.queryValidada = dadosValidados;
      } else {
        req[origem] = dadosValidados;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}