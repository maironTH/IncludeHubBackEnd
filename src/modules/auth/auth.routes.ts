import { Router } from 'express';
import { AuthController } from './auth.controller';
import { autenticar } from '../../middlewares/autenticar';

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/login', authController.login.bind(authController));
authRoutes.get('/me', autenticar, authController.me.bind(authController));

export { authRoutes };