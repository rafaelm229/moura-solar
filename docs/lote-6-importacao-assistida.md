# Lote 6 — Importação assistida de contas de energia

## Incremento 6A-1 — intake durável

Data: 05/10/2026. Escopo e contratos da SPEC-014 aprovados para implementação.
Branch: `feat/lote-6-energy-import-foundation`.

Este incremento recebe somente uma versão documental `READY`, cria uma
`EnergyBillImport` em `QUEUED` e registra `ENERGY_BILL_IMPORT_QUEUED` na outbox
na mesma transação. O payload da outbox contém apenas os IDs da importação e da
versão; nenhum dado extraído ou conteúdo pessoal é copiado para o evento.

`POST /customers/:customerId/energy-imports` exige `Idempotency-Key`,
`energy_imports:create`, leitura contextual do cliente e do documento e valida
que a versão READY pertence ao cliente. Também valida a propriedade de UC e
oportunidade opcionais. Repetir a chave e o payload devolve o resultado original;
reutilizar a chave com outro payload retorna conflito. `GET /energy-imports/:id`
exige `energy_imports:read` e revalida o contexto do cliente e documento.

Ainda não há consumidor da outbox, tentativa de extração, revisão nem confirmação
operacional neste incremento. A entrada permanece durável em `QUEUED`; o fluxo
não está liberado para operação até os incrementos de processamento, revisão e
confirmação transacional serem concluídos. O cadastro e a leitura manual continuam
disponíveis. Nenhum fornecedor é chamado.

### Validação

- `pnpm api:generate`: OpenAPI e cliente TypeScript atualizados.
- `pnpm test:migrations`: migration aplicada em banco vazio e upgrade preservando
  leitura e dossiê preexistentes; reaplicação segura.
- `node --test tests/energy-import.integration.mjs`: 4/4; inclui replay,
  outbox atômica, documento não READY, cliente/UC cruzados e grants positivos e
  negativos.
- `pnpm test:integration`: 99/99 com o novo teste incluído.
- `pnpm test:e2e`: 31/31 jornadas existentes em M2–M5/M8, navegação e consumo.
- `pnpm check`: formato, lint, tipos, 1.250 testes unitários e build aprovados.

As decisões sobre mapeamento de classe tarifária, fornecedor e limites de custo
continuam pendentes e não são inferidas nesta fatia.
