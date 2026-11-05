import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';

const authRepository = new AuthRepository();

export class AuthService {
  async login(email: string, senhaLimpa: string) {
    const pessoa = await authRepository.buscarPorEmail(email);

    // Verifica se usuário existe e se não foi inativado
    if (!pessoa || !pessoa.ativo) {
      throw new Error('Credenciais inválidas ou usuário inativo');
    }

    const senhaValida = await bcrypt.compare(senhaLimpa, pessoa.senhaHash);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas ou usuário inativo');
    }

    // O dotenv-safe garante que as variáveis existam
    const token = jwt.sign(
      { id: pessoa.id, papel: pessoa.papel },
      (process.env.JWT_SECRET || 'secret') as jwt.Secret,
      { expiresIn: (process.env.JWT_EXPIRES || '8h') as any }
    );

    // Tira o hash da senha antes de retornar
    const { senhaHash: _, ...usuarioSemSenha } = pessoa;

    return {
      token,
      usuario: usuarioSemSenha,
    };
  }

  async me(id: number) {
    const pessoa = await authRepository.buscarPorId(id);
    if (!pessoa || !pessoa.ativo) {
      throw new Error('Usuário não encontrado ou inativo');
    }
    return pessoa;
  }
}