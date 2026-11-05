import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pessoasRepository, PessoasRepository } from '../pessoas/pessoas.repository';
import { ErroHttp } from '../../lib/erros';
import { config } from '../../lib/config';


export class AuthService {
  async login(email: string, senhaLimpa: string) {
    const pessoa = await pessoasRepository.encontrarAtivaPorEmail(email);

    const senhaValida = pessoa? await bcrypt.compare(senhaLimpa, pessoa.senhaHash): false;
    
    if (!pessoa || !senhaValida) {
      throw new ErroHttp(401, "E-mail ou senha inválidos");
    }

    // O dotenv-safe garante que as variáveis existam
    const token = jwt.sign(
      { id: pessoa.id, papel: pessoa.papel },
      (config.JWT_SECRET || 'secret') as jwt.Secret,
      { expiresIn: (config.JWT_EXPIRES || "8h") as any }
    );

    // Tira o hash da senha antes de retornar
    const { senhaHash: _, ...usuarioSemSenha } = pessoa;

    return {
      token,
      usuario: usuarioSemSenha,
    };
  }

  async me(id: number) {
    const pessoa = await pessoasRepository.encontrarAtivaPorId(id);
    if (!pessoa) {
      throw new ErroHttp(401, 'Usuário não encontrado ou inativo');
    }
    return pessoa;
  }
}