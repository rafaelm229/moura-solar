# R1-32 — Outbox para atividade de formalização após aceite

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no branch `feat/proposal-visual-clarity` pelo PR #71,
merge `ceb84ad9b7ea9e5f3c268790da0f95904212ab11`. Não representa liberação em
`main` nem ativação de consumidor.

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
- Integração PostgreSQL, `pnpm check`, Prettier, links e `git diff --check`
  passaram localmente; CI remota não iniciou checkout/testes.

## Execução e evidências

- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/proposal.integration.mjs`: 7/7
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo rollback do evento filho.
- `pnpm check`: passou fora do sandbox; o primeiro intento no sandbox bloqueou
  os dois testes existentes de DOCX com `spawnSync unzip EPERM`.
- Prettier, links locais e `git diff --check`: passaram.
- CI #127 falhou em `Initialize containers`, antes do checkout e dos testes: o
  runner expirou ao tentar baixar `postgres:17-alpine` do Docker Hub. Resultado
  de CI: **não validado**.
- Consolidação: PR #71 em `feat/proposal-visual-clarity`, merge
  `ceb84ad9b7ea9e5f3c268790da0f95904212ab11`.

## Rollback

Remover apenas a gravação do evento filho e seus testes. Nenhuma migration ou
evento pai precisa de reversão; manter a transação e o comportamento de aceite.
