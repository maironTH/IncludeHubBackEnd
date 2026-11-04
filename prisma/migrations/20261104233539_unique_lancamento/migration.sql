/*
  Warnings:

  - A unique constraint covering the columns `[pessoaId,projetoId,semanaInicio]` on the table `lancamentos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "projetos" ALTER COLUMN "inicio" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_pessoaId_projetoId_semanaInicio_key" ON "lancamentos"("pessoaId", "projetoId", "semanaInicio");
