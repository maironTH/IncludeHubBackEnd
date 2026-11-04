-- Necessária para a regra de "sem alocações sobrepostas" mais abaixo.
-- Permite combinar igualdade (pessoa, projeto) com sobreposição de datas.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- PESSOAS ---------------------------------------------------------------
-- Capacidade semanal entre 1 e 168 horas (uma semana tem 168 horas).
ALTER TABLE pessoas
  ADD CONSTRAINT pessoas_horas_semanais_ck
  CHECK ("horasSemanais" BETWEEN 1 AND 168);

-- PROJETOS --------------------------------------------------------------
-- Projeto de cliente OBRIGA ter gerente e horas contratadas (maiores que 0).
-- Projeto interno (Reunião, Treinamento) não precisa de nenhum dos dois.
-- Segunda regra: a data final prevista não pode ser antes da inicial.
ALTER TABLE projetos
  ADD CONSTRAINT projetos_cliente_ck
  CHECK (
    tipo = 'INTERNO'
    OR ("gerenteId" IS NOT NULL AND "horasContratadas" IS NOT NULL AND "horasContratadas" > 0)
  ),
  ADD CONSTRAINT projetos_periodo_ck
  CHECK ("inicio" IS NULL OR "fimPrevisto" IS NULL OR "fimPrevisto" >= "inicio");

-- ALOCAÇÕES -------------------------------------------------------------
-- Horas previstas por semana entre 0 e 168, e o fim da alocação
-- (quando existe) não pode ser antes do início.
ALTER TABLE alocacoes
  ADD CONSTRAINT alocacoes_horas_ck
  CHECK ("horasPrevistasSemana" >= 0 AND "horasPrevistasSemana" <= 168),
  ADD CONSTRAINT alocacoes_periodo_ck
  CHECK ("fim" IS NULL OR "fim" >= "inicio");

-- A mesma pessoa não pode ter dois períodos de alocação que se sobreponham
-- no mesmo projeto. O fim é inclusivo; fim vazio = alocação em aberto
-- (tratada como "até o infinito").
ALTER TABLE alocacoes
  ADD CONSTRAINT alocacoes_sem_sobreposicao
  EXCLUDE USING gist (
    "pessoaId" WITH =,
    "projetoId" WITH =,
    daterange("inicio", COALESCE("fim" + 1, 'infinity'::date), '[)') WITH &&
  );

-- LANÇAMENTOS -----------------------------------------------------------
-- Horas entre 0 e 168, e a semana tem que começar numa segunda-feira
-- (no Postgres, ISODOW = 1 significa segunda).
ALTER TABLE lancamentos
  ADD CONSTRAINT lancamentos_horas_ck
  CHECK (horas >= 0 AND horas <= 168),
  ADD CONSTRAINT lancamentos_semana_segunda_ck
  CHECK (EXTRACT(ISODOW FROM "semanaInicio") = 1);