import { Router } from "express";
import { pessoasController } from "./pessoas.controller";
import { validar } from "../../middlewares/validar";
import { criarPessoaSchema, atualizarPessoaSchema } from "./pessoas.schema";
import { autenticar } from "../../middlewares/autenticar";
import { exigirPapel } from "../../middlewares/exigir-papel";

export const pessoasRoutes = Router();
pessoasRoutes.use(autenticar) 

// GET /api/pessoas -> Lista pessoas ativas (ou com filtros ?papel=... e ?situacao=ativas|inativas|todas)
pessoasRoutes.get("/", exigirPapel(["ADMIN", "GERENTE"]), pessoasController.listar);

// GET /api/pessoas/inativas -> Rota direta para listar pessoas inativas (exclusivo ADMIN)
pessoasRoutes.get("/inativas", exigirPapel(["ADMIN"]), (req, res, next) => {
  req.query.situacao = "inativas";
  pessoasController.listar(req, res, next);
});

// GET /api/pessoas/:id -> Busca detalhes de uma pessoa por ID
pessoasRoutes.get("/:id", exigirPapel(["ADMIN", "GERENTE"]), pessoasController.obterPorId);

// POST /api/pessoas -> Cadastra nova pessoa com validação Zod (só admin)
pessoasRoutes.post("/", exigirPapel(["ADMIN"]), validar(criarPessoaSchema), pessoasController.criar);

// PATCH /api/pessoas/:id -> Edita dados ou realiza Soft Delete com { "ativo": false } (só admin)
pessoasRoutes.patch("/:id", exigirPapel(["ADMIN"]), validar(atualizarPessoaSchema), pessoasController.atualizar);