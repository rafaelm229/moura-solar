# R1-42 — Outbox de revisão e aprovação do contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-42-outbox-contract-review`; CI pendente.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-042](adr/ADR-042-eventos-revisao-aprovacao-contrato.md).

**Dependências:** R1-24 (envelope `ACTIVITY_CREATED`) e R1-41 (evento
`CONTRACT_CREATED`); comandos autenticados existentes de revisão/aprovação.

## Diferenças antes/depois

- **Antes:** os comandos alteravam estado e, opcionalmente, notas privadas fora
  de transação, sem auditoria ou evento.
- **Depois (R1-42):** cada comando atualiza estado, grava auditoria e um evento
  próprio (`CONTRACT_REVIEW_REQUESTED` ou `CONTRACT_APPROVED`) na mesma
  transação local.
- **Payload:** `contractId`, `auditEventId` e `opportunityId`; notas não são
  publicadas.
- **Limites:** estados permanecem `PENDING_REVIEW` e `READY`; sem gate liberado,
  efeito financeiro, atividade, migration, OpenAPI ou consumidor/dispatcher.

## Critérios de aceite

- Cada comando autenticado persiste seu evento correlacionado com a auditoria.
- Eventos carregam somente IDs e parsers rejeitam detalhes extras.
- Falha forçada de gravação da outbox reverte estado, notas e auditoria.
- Documentos continuam intactos e o gate `CONTRACT` permanece `PENDING`.

## Riscos e rollback

As notas continuam persistidas no contrato conforme comportamento existente;
este incremento apenas não as publica. Rollback remove os novos contratos e
gravações de auditoria/outbox, sem alterar endpoints e estados existentes.

## Evidências

- `pnpm --filter @moura-solar/api build` — passou.
- `node --test --test-concurrency=1 --test-reporter=spec tests/contract.integration.mjs` — 9/9 cenários passaram com PostgreSQL e armazenamento locais.
- `pnpm check` — passou (formatação, lint, typecheck, 1.360 testes unitários e builds).
- `git diff --check` — passou.
- CI ainda não executada; aguarda publicação da branch e PR.
