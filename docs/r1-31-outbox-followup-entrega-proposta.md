# R1-31 — Outbox para follow-up de entrega de proposta

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Em implementação na branch
`codex/r1-31-proposal-delivery-activity-event`.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-031](adr/ADR-031-outbox-followup-entrega-proposta.md).

**Dependências:** R1-14 e R1-24 consolidados; entrega de proposta, auditoria,
transição de oportunidade e follow-up automático já ocorrem na mesma transação.

## Antes/depois

- **Antes:** o registro manual de entrega persistia `PROPOSAL_DELIVERED` e criava
  follow-up automático, sem evento próprio para a atividade.
- **Depois:** o follow-up também gera `ACTIVITY_CREATED` v1 na mesma transação.
- **Semântica:** não altera canal, destinatário, envio, validade, gates, estado ou
  resposta HTTP.
- **Payload:** `activityId`, `auditEventId`, `customerId` e `opportunityId`; sem
  assunto, descrição, tipo, responsável ou vencimento.
- **Correlação/deduplicação:** `requestId`; dedupe inclui IDs da auditoria e da
  atividade.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.

## Execução e evidências locais

- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/proposal.integration.mjs`: 7/7
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo rollback do evento filho.
- `pnpm check`, CI, links locais, Prettier e `git diff --check` ainda pendentes.

## Critérios de aceite

- Reutilizar contrato `ACTIVITY_CREATED` v1 com auditoria compartilhada e payload
  mínimo.
- Integração comprova evento pai/filho, correlação, `publishedAt` nulo e vínculo
  do evento com a atividade automática.
- Falha ao gravar o evento filho reverte entrega, versão, follow-up, auditoria e
  `PROPOSAL_DELIVERED`.
- `pnpm check`, integração de proposta PostgreSQL, CI, links locais, Prettier e
  `git diff --check`.
- Rollback remove apenas o produtor filho, preservando a entrega e o evento pai.

## Limites

R1-31 não altera outras atividades criadas em propostas/contratos, não publica
eventos e não ativa consumidor. Importação de contas permanece manual; OCR,
worker e serviços externos seguem fora do escopo.
