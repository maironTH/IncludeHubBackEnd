import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validar(schema: ZodSchema, origem: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[origem] = schema.parse(req[origem]);
      next();
    } catch (error) {
      next(error);
    }
  };
}