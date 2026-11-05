import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";// hash

const prisma = new PrismaClient()// conexão usada só pelo seed

async function main() {
  //Limpa tudo (ordem importa filho->pai)
  await prisma.historicoStatus.deleteMany();
  await prisma.lancamento.deleteMany();
  await prisma.alocacao.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.pessoa.deleteMany();
  await prisma.categoria.deleteMany();

  //Categorias 
  const dev = await prisma.categoria.create({ data: { nome: "Desenvolvedor" } });
  const consultor = await prisma.categoria.create({ data: { nome: "Consultor" } });
  const designer = await prisma.categoria.create({ data: { nome: "Trainee" } });

  //Pessoas
  const senhaHash = await bcrypt.hash("senha123", 10);

  await prisma.pessoa.create({
    data: { nome: "Admin ", email: "admin@includehub.com", senhaHash,
            papel: "ADMIN", horasSemanais: 20 },
  });
  const gerente = await prisma.pessoa.create({
    data: { nome: "Gabriela Gerente", email: "gerente@includehub.com", senhaHash,
            papel: "GERENTE", categoriaId: consultor.id, horasSemanais: 20 },
  });
  const ana = await prisma.pessoa.create({
    data: { nome: "Ana Dev", email: "ana@includehub.com", senhaHash,
            papel: "COLABORADOR", categoriaId: dev.id, horasSemanais: 20 },
  });
  const beto = await prisma.pessoa.create({
    data: { nome: "Beto Design", email: "beto@includehub.com", senhaHash,
            papel: "COLABORADOR", categoriaId: designer.id, horasSemanais: 15 },
  });

  //Projetos
  const site = await prisma.projeto.create({
    data: { nome: "Site Institucional", tipo: "CLIENTE", cliente: "Empresa X",
            gerenteId: gerente.id, horasContratadas: 300, status: "NO_PRAZO",
            inicio: new Date("2026-10-05"), fimPrevisto: new Date("2026-12-18") },
  });
  const includehub = await prisma.projeto.create({ data: { nome: "IncludeHub",     tipo: "INTERNO" } });
  const includeleads = await prisma.projeto.create({ data: { nome: "IncludeLeads", tipo: "INTERNO" } });

  //Alocações
  await prisma.alocacao.createMany({
    data: [
      // Colaboradores no projeto de cliente
      { pessoaId: ana.id,     projetoId: site.id,       categoriaId: dev.id,      horasPrevistasSemana: 12, inicio: new Date("2026-10-05") },
      { pessoaId: beto.id,    projetoId: site.id,       categoriaId: designer.id, horasPrevistasSemana: 6,  inicio: new Date("2026-10-05") },
      // Gerente participa dos projetos internos (necessário para lançar horas)
      { pessoaId: gerente.id, projetoId: includehub.id,    categoriaId: consultor.id, horasPrevistasSemana: 4,  inicio: new Date("2026-10-05") },
      { pessoaId: gerente.id, projetoId: includeleads.id, categoriaId: consultor.id, horasPrevistasSemana: 2,  inicio: new Date("2026-10-05") },
    ],
  });

  //Primeira entrada do histórico de saúde do projeto
  await prisma.historicoStatus.create({
    data: { projetoId: site.id, status: "NO_PRAZO",
            justificativa: "Projeto iniciado", alteradoPorId: gerente.id },
  });

  //Lançamentos: simula 4 semanas de execução real
  await prisma.lancamento.createMany({
    data: [
      // ── Ana Dev → Site Institucional
      // Ocupação planejada: 12h/semana (de 20h). Realizada variou levemente.
      { pessoaId: ana.id, projetoId: site.id, semanaInicio: new Date("2026-10-05"), horas: 12, descricao: "Implementação do header e navbar" },
      { pessoaId: ana.id, projetoId: site.id, semanaInicio: new Date("2026-10-12"), horas: 10, descricao: "Integração com API de contatos" },
      { pessoaId: ana.id, projetoId: site.id, semanaInicio: new Date("2026-10-19"), horas: 14, descricao: "Correção de bugs e ajustes de responsividade" },
      { pessoaId: ana.id, projetoId: site.id, semanaInicio: new Date("2026-10-26"), horas: 11, descricao: "Testes e deploy em staging" },

      // ── Beto Design → Site Institucional
      // Ocupação planejada: 6h/semana (de 15h).
      { pessoaId: beto.id, projetoId: site.id, semanaInicio: new Date("2026-10-05"), horas: 6,  descricao: "Criação das telas no Figma" },
      { pessoaId: beto.id, projetoId: site.id, semanaInicio: new Date("2026-10-12"), horas: 5,  descricao: "Revisão do guia de identidade visual" },
      { pessoaId: beto.id, projetoId: site.id, semanaInicio: new Date("2026-10-19"), horas: 7,  descricao: "Ajustes após feedback do cliente" },
      { pessoaId: beto.id, projetoId: site.id, semanaInicio: new Date("2026-10-26"), horas: 6,  descricao: "Exportação dos assets finais" },

      // ── Gerente → includehub (projeto interno)
      { pessoaId: gerente.id, projetoId: includehub.id, semanaInicio: new Date("2026-10-05"), horas: 2, descricao: "Alinhamento semanal de equipe" },
      { pessoaId: gerente.id, projetoId: includehub.id, semanaInicio: new Date("2026-10-12"), horas: 3, descricao: "Reunião de kickoff com cliente" },
      { pessoaId: gerente.id, projetoId: includehub.id, semanaInicio: new Date("2026-10-19"), horas: 2, descricao: "Retrospectiva de sprint" },
      { pessoaId: gerente.id, projetoId: includehub.id, semanaInicio: new Date("2026-10-26"), horas: 2, descricao: "Planejamento da próxima fase" },

      // ── Gerente → IncludeLeads (projeto interno)
      { pessoaId: gerente.id, projetoId: includeleads.id, semanaInicio: new Date("2026-10-12"), horas: 4, descricao: "Boas práticas de gestão ágil" },
      { pessoaId: gerente.id, projetoId: includeleads.id, semanaInicio: new Date("2026-10-26"), horas: 4, descricao: "Workshop de comunicação com clientes" },
    ],
  });

  console.log("Seed concluído.");
}

main()
  .catch((erro) => { console.error(erro); process.exit(1); })// se der erro, mostra e sai com falha
  .finally(() => prisma.$disconnect());// sempre fecha a conexão no fim