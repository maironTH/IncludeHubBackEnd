import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validar(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}