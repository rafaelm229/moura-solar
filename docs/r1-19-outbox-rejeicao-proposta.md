# R1-19 — Contrato e outbox local para rejeição de proposta

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #46, merge commit `8a5159c`; CI completa verde.

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-019](adr/ADR-019-outbox-rejeicao-proposta.md).

**Dependências:** R1-18 consolidado; `ProposalService.recordRejection` atualiza
status/observações e registra auditoria na mesma transação local. O endpoint já
exige `proposals:reject`.

## Antes/depois

- **Antes:** a versão é marcada como `REJECTED`, o motivo é acrescentado às
  observações e uma auditoria é gravada; o request ID não chegava ao serviço e
  não havia fato durável na outbox.
- **Depois:** `PROPOSAL_REJECTED` v1 é inserido na mesma transação local da
  atualização e auditoria.
- **Semântica:** representa a rejeição já registrada; não altera permissão,
  conteúdo textual, validade, status ou outros gates da proposta.
- **Payload:** IDs de auditoria, proposta, versão e oportunidade; sem motivo,
  notas, observações, snapshots ou preços.
- **Correlação/deduplicação:** `requestId` do comando e ID imutável de
  `AuditEvent`.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** evento permanece não publicado; sem dispatcher, consumidor,
  broker ou integração externa.

## Critérios de aceite

- Contrato v1 valida os quatro identificadores, agregado `Proposal` e rejeita
  tipo/versão/campos extras inválidos.
- Teste de integração confirma que autorização existente é preservada e que a
  rejeição mantém o comportamento atual.
- Integração confirma correlação, vínculo à auditoria, proposta/versão/oportunidade,
  payload sem texto de rejeição e `publishedAt` nulo.
- Falha forçada da outbox reverte status/observações e auditoria.
- `pnpm check`, build/testes de contratos, integração de propostas com PostgreSQL
  e MinIO locais, CI completa, links locais, Prettier e `git diff --check`.
- Rollback remove somente o produtor/contrato novos; preserva auditoria,
  observações e estrutura da outbox.

## Evidência e limites

Os testes de `@moura-solar/contracts` passaram (42/42); build da API passou;
`tests/proposal.integration.mjs` passou 7/7 com PostgreSQL e MinIO locais,
incluindo 401 sem sessão, payload correlacionado e rollback forçado.
`pnpm check` passou em formatação, lint, typecheck, 1.257 testes da API, 5 da
web, 24 testes offline do harness histórico da PoC e build. CI completa passou
com geração da API, migrations, integrações e E2E. Prettier, links locais e
`git diff --check` passaram. Nenhuma migration de aplicação. R1 permanece em
andamento. A importação de contas continua manual conforme ADR-008, fora do
escopo deste incremento.
