# ADR-034 — Outbox para atividade da conferência de contrato

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-34; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-007, SPEC-016 e SPEC-019

## Contexto

`verifySignedContract` cria uma atividade diferente conforme a decisão humana:
após aprovação agenda o início da engenharia; após rejeição agenda a
regularização da assinatura. A transação já grava a auditoria
`CONTRACT_VERIFIED_GATE_C` ou `CONTRACT_SIGNED_REJECTED`, mas ainda não registra
um evento `ACTIVITY_CREATED` para essa atividade.

## Decisão

- Emitir `ACTIVITY_CREATED` v1 para a atividade criada em cada decisão de
  conferência, na mesma transação local.
- Reutilizar a auditoria correspondente à decisão; não criar auditoria separada.
- Usar a atividade como agregado e payload mínimo `activityId`, `auditEventId`,
  `customerId` e `opportunityId`.
- Correlacionar pelo `requestId` recebido pela API e deduplicar por
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Manter a conferência humana, seus critérios, gates, transições, autorização e
  resposta atuais.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; reutilizar `IntegrationOutbox` e `AuditEvent` existentes.
- Falha ao gravar o evento reverte revisão, estado/gate/transição, atividade e
  auditoria dentro da transação PostgreSQL.
- A importação de contas de energia permanece manual conforme ADR-008; este
  evento trata exclusivamente da conferência humana de contrato.

## Evidência necessária para R1-34

Integração comprova payload mínimo, correlação, deduplicação para aprovação e
rejeição, rollback quando a inserção na outbox falha, `pnpm check`, CI, links,
Prettier e `git diff --check`.
