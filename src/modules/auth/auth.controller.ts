import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';

const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, senha } = loginSchema.parse(req.body);
      const resultado = await authService.login(email, senha);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.user!.id;
      const usuario = await authService.me(id);
      res.status(200).json(usuario);
    } catch (error) {
      next(error);
    }
  }
}