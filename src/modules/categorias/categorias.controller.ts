// src/modules/categorias/categorias.controller.ts
import { Request, Response, NextFunction } from "express";
import { categoriasService, CategoriasService } from "./categorias.service";

export class CategoriasController {
  constructor(private service: CategoriasService = categoriasService) {}

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categorias = await this.service.listar();
      res.status(200).json(categorias);
    } catch (error) {
      next(error);
    }
  };
}

export const categoriasController = new CategoriasController();