# R1-32 — Outbox para atividade de formalização após aceite

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Em implementação na branch
`codex/r1-32-proposal-acceptance-activity-event`.

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-032](adr/ADR-032-outbox-atividade-formalizacao-proposta.md).

**Dependências:** R1-24, R1-31 e R1-09 consolidados; aceite já cria atividade de
formalização e persiste `PROPOSAL_ACCEPTED` na transação local.

## Antes/depois

- **Antes:** o aceite persistia `PROPOSAL_ACCEPTED` e criava uma atividade de
  formalização, sem evento próprio para a atividade.
- **Depois:** emite `ACTIVITY_CREATED` v1 na mesma transação, compartilhando a
  auditoria `PROPOSAL_ACCEPTED`.
- **Semântica:** não altera gates, aceite, transição, atividade ou resposta HTTP.
- **Payload:** `activityId`, `auditEventId`, `customerId` e `opportunityId`; sem
  assunto, descrição, tipo, responsável ou vencimento.
- **Correlação/deduplicação:** `requestId`; dedupe inclui IDs da auditoria e da
  atividade.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.

## Critérios de aceite

- Emitir um evento filho vinculado à atividade e à auditoria do aceite.
- Confirmar `PROPOSAL_ACCEPTED` e `ACTIVITY_CREATED` na mesma transação, com
  correlação comum e dedupe `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Injetar falha na gravação do evento filho e confirmar rollback integral do
  aceite, versão, oportunidade, transição, atividade, auditoria e evento pai.
- Preservar a resposta HTTP e o comportamento atual de aceite duplicado (409).
- Validar com integração PostgreSQL, `pnpm check`, Prettier, links e
  `git diff --check`; registrar separadamente qualquer falha de CI externa.

## Execução e evidências

- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/proposal.integration.mjs`: 7/7
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo rollback do evento filho.
- `pnpm check`: passou fora do sandbox; o primeiro intento no sandbox bloqueou
  os dois testes existentes de DOCX com `spawnSync unzip EPERM`.
- Prettier e `git diff --check`: passaram. Links serão verificados novamente
  após concluir os links cruzados desta entrega.
- CI remota: não executada, pois a branch ainda não foi enviada.

## Rollback

Remover apenas a gravação do evento filho e seus testes. Nenhuma migration ou
evento pai precisa de reversão; manter a transação e o comportamento de aceite.
