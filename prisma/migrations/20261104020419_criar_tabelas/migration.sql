-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'GERENTE', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "TipoProjeto" AS ENUM ('CLIENTE', 'INTERNO');

-- CreateEnum
CREATE TYPE "StatusProjeto" AS ENUM ('NO_PRAZO', 'EM_RISCO', 'ATRASADO');

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pessoas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "categoriaId" INTEGER,
    "horasSemanais" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoProjeto" NOT NULL,
    "cliente" TEXT,
    "gerenteId" INTEGER,
    "horasContratadas" INTEGER,
    "status" "StatusProjeto" NOT NULL DEFAULT 'NO_PRAZO',
    "inicio" DATE NOT NULL,
    "fimPrevisto" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" SERIAL NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "horasPrevistasSemana" DECIMAL(5,2) NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,

    CONSTRAINT "alocacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" SERIAL NOT NULL,
    "pessoaId" INTEGER NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "semanaInicio" DATE NOT NULL,
    "horas" DECIMAL(5,2) NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" SERIAL NOT NULL,
    "projetoId" INTEGER NOT NULL,
    "status" "StatusProjeto" NOT NULL,
    "justificativa" TEXT,
    "alteradoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_email_key" ON "pessoas"("email");

-- AddForeignKey
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_gerenteId_fkey" FOREIGN KEY ("gerenteId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_alteradoPorId_fkey" FOREIGN KEY ("alteradoPorId") REFERENCES "pessoas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
