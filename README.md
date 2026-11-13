# 🚀 IncludeHub API (Back-end)

> Central de alocação e acompanhamento de projetos: pessoas, projetos, alocações e apontamento semanal de horas, com ocupação, disponibilidade e saúde dos projetos calculadas no servidor.

[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://includehub-api.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.12+-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)

## 🔗 Links

| | |
| --- | --- |
| Repositório | [maironTH/IncludeHubBackEnd](https://github.com/maironTH/IncludeHubBackEnd) |
| Front-end (Vercel) | [include-hub-front-v2.vercel.app](https://include-hub-front-v2.vercel.app) |
| API em produção | `https://includehub-api.onrender.com` |
| Protótipo (Figma) | [IncludeHub no Figma](https://www.figma.com/design/QJWgjS7uE8s2RRXNMbvtTd/IncludeHub?node-id=0-1&p=f) |
| Documentação completa | [Documento no Google Docs](https://docs.google.com/document/d/1gbyX6ydmqIVfm986P4oDcqlPkV-Mbw1qeA8lNJ-ygs8/edit?tab=t.0#heading=h.trbs04zenewm) |

## 📌 Sobre o projeto

Resposta ao **Desafio 3 (Central de Alocação e Acompanhamento de Projetos)**. O back-end cobre os quatro requisitos obrigatórios do MVP:

| Requisito do desafio | Como é atendido |
| --- | --- |
| Mapeamento de equipes e projetos | Cadastro de projetos (cliente e internos) com gerente responsável e alocação de pessoas por categoria |
| Acompanhamento de horas | Lançamento semanal por projeto, em lote e em uma única transação, com descrição opcional da tarefa |
| Saúde do projeto | Status *No prazo*, *Em risco* e *Atrasado*, alterado pelo gerente responsável, com histórico imutável e justificativa |
| Visão de disponibilidade | Taxa de ocupação **planejada** (alocações) e **realizada** (horas lançadas), com rótulos prontos: `SOBRECARREGADO`, `NORMAL` e `DISPONIVEL` |

O servidor decide e o front exibe: percentuais, rótulos e alertas já saem calculados da API.

## 🛠️ Tecnologias

| Camada | Ferramenta |
| --- | --- |
| Linguagem | TypeScript 7 sobre Node.js 22.12 ou superior |
| Framework | Express 5 |
| Banco | PostgreSQL 16 com Prisma 6 (migrations versionadas) |
| Validação | Zod 4 |
| Segurança | JWT (`jsonwebtoken`, validade de 8 horas), senhas com `bcrypt` e CORS por lista de origens |
| Testes | Vitest 5 e Supertest |
| Ambiente local | Docker Compose (banco) e `tsx` (execução em desenvolvimento) |

## 🏗️ Arquitetura

Monolito modular em camadas. Cada requisição passa por:

```
Rota → Controller → Service → Repository → Banco
                       │
                       └──→ Domain (cálculos puros)
```

| Camada | Responsabilidade |
| --- | --- |
| Controller | Recebe a requisição e devolve a resposta |
| Service | Aplica regras e confere permissões que dependem do caso (por exemplo, "este usuário é o gerente do projeto?") |
| Repository | Único ponto de acesso ao Prisma; aplica o filtro de Soft Delete (`ativo: true`) |
| Domain | Funções puras, sem Express nem Prisma: semana (UTC), ocupação e estouro de horas |

Antes do controller, cada rota passa pelos middlewares `autenticar` (JWT, e confere no banco se a pessoa continua ativa), `exigirPapel` e `validar` (Zod). Um middleware `tratarErros` traduz qualquer erro na resposta certa, sempre no formato `{ "erro": "mensagem" }`, com `detalhes` quando o erro é por campo.

Decisões que valem destacar:

- **Regras no banco também.** Migrations com restrições no PostgreSQL: horas semanais entre 1 e 168, projeto de cliente exige gerente e horas contratadas, alocações da mesma pessoa no mesmo projeto não se sobrepõem no tempo (`EXCLUDE USING gist`) e lançamentos só começam numa segunda-feira.
- **Soft Delete.** Pessoas e projetos são inativados, nunca excluídos, para preservar o histórico. Quem é inativado perde o acesso na hora.
- **Batch Upsert.** `PUT /api/lancamentos` salva a semana inteira em uma transação: tudo salva ou nada salva.
- **Datas em UTC.** A semana é sempre a segunda-feira, e as datas trafegam como `AAAA-MM-DD`, para o fuso do servidor não mudar o dia.

### Estrutura de pastas

```
prisma/
  schema.prisma       modelo de dados
  migrations/         histórico e restrições do banco
  seed.ts             dados de demonstração
src/
  modules/            auth, pessoas, projetos, alocacoes, lancamentos,
                      dashboard, relatorios e categorias
                      (cada um com routes, controller, service e repository)
  domain/             semana, ocupação e estouro de horas
  middlewares/        autenticar, exigir-papel, validar e tratar-erros
  lib/                prisma, config e erros
  app.ts              monta o Express e as rotas
  server.ts           sobe o servidor
tests/                testes de domínio e de rotas
```

## 👥 Permissões por papel

| Ação | 🛡️ Admin | 👔 Gerente | 💻 Colaborador |
| --- | --- | --- | --- |
| Ver projetos | todos | os que gerencia | onde está alocado, mais os internos |
| Cadastrar projetos e pessoas | sim | não | não |
| Inativar pessoas e projetos | sim | não | não |
| Alocar colaboradores | sim | nos seus projetos | não |
| Alterar o status de saúde | não (apenas visualiza) | nos seus projetos | não |
| Lançar horas | não | as próprias | as próprias |
| Listar pessoas | sim | sim (sua equipe) | não |
| Ver disponibilidade | todos | sua equipe | só a própria |

O middleware barra rotas inteiras por papel, e o service confere o que depende do caso. Há também proteções no cadastro de pessoas: o último administrador ativo não pode ser inativado nem rebaixado, ninguém inativa a si mesmo, um gerente com projetos ativos não pode ser inativado nem rebaixado, e o e-mail é único.

## ⚙️ Como rodar localmente

**Pré-requisitos:** Node.js 22.12 ou superior, Docker e Git.

**1. Clone e instale**

```bash
git clone https://github.com/maironTH/IncludeHubBackEnd.git
cd IncludeHubBackEnd
npm install
```

**2. Variáveis de ambiente.** Copie o exemplo e preencha:

```bash
cp .env.example .env
```

```env
PORT=3333
DATABASE_URL="postgresql://includehub:includehub@localhost:5432/includehub?schema=public"
JWT_SECRET="troque-por-um-segredo-longo"
JWT_EXPIRES="8h"
```

`JWT_EXPIRES` aceita texto (`8h`) ou segundos (`28800`). Opcionalmente, `CORS_ORIGINS` lista as origens liberadas, separadas por vírgula (padrão: `http://localhost:5173`).

**3. Suba o banco**

```bash
docker compose up -d
```

O Compose cria um PostgreSQL 16 em `127.0.0.1:5432`, com usuário, senha e banco `includehub`.

**4. Migrations e seed.** O seed exige uma senha para cada papel, com **12 caracteres ou mais**:

```bash
export SEED_SENHA_ADMIN="..."
export SEED_SENHA_GERENTE="..."
export SEED_SENHA_COLABORADOR="..."

npx prisma migrate dev
npx prisma db seed
```

No fish, use `set -x SEED_SENHA_ADMIN '...'` (e o mesmo para as outras duas).

> ⚠️ O seed **apaga todas as tabelas** antes de popular. Nunca o rode contra o banco de produção.

**5. Inicie o servidor**

```bash
npm run dev
```

A API sobe em `http://localhost:3333`.

### Usuários de demonstração

O seed cria categorias, projetos de cliente e internos, alocações e semanas de lançamentos de exemplo. As senhas são as definidas em `SEED_SENHA_*`.

| E-mail | Papel | Senha definida em |
| --- | --- | --- |
| `admin@includehub.com` | Admin | `SEED_SENHA_ADMIN` |
| `gerente@includehub.com` | Gerente (Gabriela) | `SEED_SENHA_GERENTE` |
| `ana@includehub.com` | Colaboradora (Ana, dev) | `SEED_SENHA_COLABORADOR` |
| `beto@includehub.com` | Colaborador (Beto, design) | `SEED_SENHA_COLABORADOR` |

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor em desenvolvimento, com recarga automática |
| `npm run build` | Gera o client do Prisma e compila para `dist/` |
| `npm start` | Roda a versão compilada (`node dist/server.js`) |
| `npm test` | Roda todos os testes (`vitest run`) |

## 🧪 Testes

Atualmente são **74 testes em 8 arquivos**, que cobrem:

- **Domínio:** normalização de semana em UTC, taxas de ocupação e seus limites e estouro de horas. Funções puras, sem banco.
- **Rotas e permissões:** `tests/qa-rotas.test.ts` (36 testes) confere, por papel, o que cada rota aceita e recusa.

```bash
npm test
```

> ⚠️ Os testes de rotas usam o banco do `.env` e os usuários do seed. Rode-os somente com o banco **local** no ar e populado, nunca com o `DATABASE_URL` de produção.

## 🔌 Endpoints

Todas as rotas, exceto o login, exigem `Authorization: Bearer <token>`. O escopo do que cada papel vê é aplicado pelo servidor.

| Módulo | Rota | Acesso |
| --- | --- | --- |
| auth | `POST /api/auth/login` | Público |
| auth | `GET /api/auth/me` | Autenticado |
| categorias | `GET /api/categorias` | Autenticado |
| pessoas | `GET /api/pessoas` (filtros `?papel=` e `?situacao=`) | Admin, Gerente |
| pessoas | `GET /api/pessoas/inativas` | Admin |
| pessoas | `GET /api/pessoas/:id` | Admin, Gerente |
| pessoas | `POST /api/pessoas` | Admin |
| pessoas | `PATCH /api/pessoas/:id` (edição e inativação) | Admin |
| projetos | `GET /api/projetos` | Autenticado, filtrado por papel |
| projetos | `GET /api/projetos/:id` | Autenticado |
| projetos | `POST /api/projetos` | Admin |
| projetos | `PATCH /api/projetos/:id` (edição e inativação) | Admin |
| projetos | `PATCH /api/projetos/:id/status` | Gerente do projeto |
| projetos | `GET /api/projetos/:id/historico` | Autenticado |
| alocacoes | `GET /api/projetos/:id/alocacoes` | Autenticado |
| alocacoes | `POST /api/projetos/:id/alocacoes` | Admin, Gerente do projeto |
| alocacoes | `DELETE /api/alocacoes/:id` | Admin, Gerente do projeto |
| alocacoes | `GET /api/alocacoes/minhas` | Autenticado |
| lancamentos | `GET /api/lancamentos` | Autenticado, escopo por papel |
| lancamentos | `PUT /api/lancamentos` (semana inteira, em lote) | Gerente, Colaborador |
| dashboard | `GET /api/dashboard?periodo=semana` | Autenticado, visão por papel |
| relatorios | `GET /api/relatorios/disponibilidade` | Autenticado, escopo por papel |


Erros seguem sempre o mesmo formato:

```json
{ "erro": "Dados inválidos", "detalhes": [{ "campo": "email", "mensagem": "E-mail já cadastrado" }] }
```

| Status | Quando |
| --- | --- |
| `401` | Sem login, token vencido ou pessoa inativada |
| `403` | Autenticado, mas sem permissão |
| `404` | Registro não encontrado |
| `422` | Dado inválido ou regra de negócio violada |

## ☁️ Deploy

A API roda no **Render** (plano gratuito) e o banco no **Neon** (PostgreSQL gratuito, sem prazo de expiração).

| Campo no Render | Valor |
| --- | --- |
| Build Command | `npm install --production=false && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run start` |

Variáveis de ambiente do serviço:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Connection string **direta** do Neon (sem `-pooler`, com `sslmode=require`) |
| `JWT_SECRET` | Segredo longo e exclusivo de produção (`openssl rand -hex 32`) |
| `JWT_EXPIRES` | `28800` |
| `CORS_ORIGINS` | Origens do front, separadas por vírgula, com `https` e sem barra no final |

Pontos de atenção:

- Não defina `PORT` (o Render fornece) nem as variáveis `SEED_SENHA_*` no servidor.
- O plano gratuito suspende o serviço depois de 15 minutos sem uso, e a primeira chamada seguinte pode levar cerca de 1 minuto. O Neon também suspende o banco quando ocioso.
- As migrations e o seed foram aplicados no Neon a partir de uma máquina local. Não rode o seed de novo em produção.
- A `DATABASE_URL` e o `JWT_SECRET` ficam só nas variáveis do serviço. Nunca os commite.

## 🗺️ Escopo e próximos passos

Fora do MVP desta entrega:

- **Alerta de estouro de horas** (diferencial do desafio): o cálculo já existe e é testado em `src/domain/estouro-horas.ts`, mas ainda não é exposto pela API.
- **Exportação de relatórios em PDF** (diferencial do desafio).
- **Módulo de tarefas por projeto:** proposta em discussão.
- **Troca e redefinição de senha:** a senha inicial é definida no cadastro.
- **Configuração do Prisma:** migrar `package.json#prisma` para um `prisma.config.ts`, antes de qualquer atualização para o Prisma 7.