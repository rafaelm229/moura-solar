# R1-28 — Outbox para primeira atividade criada com oportunidade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado.

**Implementação:** PR #63, merge squash `ac139dc21cada0e9d39bdcd2a38fda42a430fde8`.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-028](adr/ADR-028-outbox-primeira-atividade-oportunidade.md).

**Dependências:** R1-24 e R1-27 consolidados; `OPPORTUNITY_CREATED` v1 e a criação
transacional de primeira atividade já existem.

## Antes/depois

- **Antes:** criar oportunidade criava a primeira atividade e emitia
  `OPPORTUNITY_CREATED`, mas não um fato `ACTIVITY_CREATED` separado.
- **Depois:** emite também `ACTIVITY_CREATED` v1 na mesma transação.
- **Semântica:** não altera validações, autorização, transição, auditoria ou
  resposta HTTP. A auditoria do comando existente ancora ambos os eventos.
- **Payload:** `activityId`, `auditEventId`, `customerId` e `opportunityId`; sem
  assunto, descrição, tipo, responsável ou vencimento.
- **Correlação/deduplicação:** `requestId`; dedupe inclui IDs da auditoria e da
  atividade para distinguir o fato filho.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.
- **Fora deste incremento:** tarefas criadas por outros comandos, como follow-up
  de qualificação, ficam explicitamente pendentes.

## Execução e evidências locais

- `pnpm --filter @moura-solar/contracts test`: 57/57 passaram.
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/commercial.integration.mjs`: 19/19
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo os eventos pai/filho e
  rollback integral.
- `pnpm check`: passou; API 1.257/1.257 testes e builds sem falhas.
- CI #119 passou integralmente: `pnpm check`, geração da API, migrations,
  integração e E2E.
- PR #63 foi consolidado em `ac139dc21cada0e9d39bdcd2a38fda42a430fde8`.
- A atualização documental pós-merge será registrada em PR separado, sem
  alteração da implementação consolidada.

## Critérios de aceite

- Contrato existente `ACTIVITY_CREATED` v1 valida o payload mínimo e rejeita
  qualquer texto/dado operacional.
- Integração comprova os eventos de oportunidade e atividade, auditoria
  compartilhada, correlação, `publishedAt` nulo e rollback total quando a
  inserção do evento filho falha.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI completa, links locais,
  Prettier e `git diff --check`.
- Rollback remove só o segundo produtor, preservando a criação atual e o evento
  de oportunidade.

## Limites

R1-28 não publica eventos nem ativa consumidor. Importação de contas permanece
manual; OCR, worker e serviços externos seguem fora do escopo.
