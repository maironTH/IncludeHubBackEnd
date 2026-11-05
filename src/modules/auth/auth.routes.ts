import { Router } from 'express';
import { AuthController } from './auth.controller';

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/login', authController.login.bind(authController));
authRoutes.get('/me',    authController.me.bind(authController));

export { authRoutes };