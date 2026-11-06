// src/modules/categorias/categorias.service.ts
import { categoriasRepository, CategoriasRepository } from "./categorias.repository";

export class CategoriasService {
  constructor(private repo: CategoriasRepository = categoriasRepository) {}

  async listar() {
    return this.repo.listarTodas();
  }
}

export const categoriasService = new CategoriasService();