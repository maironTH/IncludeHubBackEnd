import { NextFunction, Request, Response } from "express";
import { dashboardService, DashboardService } from "./dashboard.service";
import { DashboardQuery } from "./dashboard.schema";

export class DashboardController {
  constructor(private service: DashboardService = dashboardService) {}

  obter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as DashboardQuery;
      const resultado = await this.service.obter(req.user!, query.semana);
      res.status(200).json(resultado);
    } catch (erro) {
      next(erro);
    }
  };
}

export const dashboardController = new DashboardController();
