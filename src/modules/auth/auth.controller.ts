import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';

const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, senha } = loginSchema.parse(req.body);
      const resultado = await authService.login(email, senha);
      res.status(200).json(resultado);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(422).json({ erros: error.issues });
        return;
      }
      // Para erros de negócio (senha errada, inativo), retorna 401
      res.status(401).json({ erro: error.message });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      // req.usuario é injetado pelo middleware autenticar
      const id = (req as any).usuario.id;
      const usuario = await authService.me(id);
      res.status(200).json(usuario);
    } catch (error: any) {
      res.status(401).json({ erro: error.message });
    }
  }
}