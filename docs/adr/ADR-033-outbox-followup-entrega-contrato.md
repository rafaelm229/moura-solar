# ADR-033 — Outbox para follow-up de entrega de contrato

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-33; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-007, SPEC-016 e SPEC-019

## Contexto

`recordDelivery` registra a entrega do contrato, muda o contrato para `SENT` e
cria um follow-up para assinatura na mesma transação. Ainda não registra um fato
`ACTIVITY_CREATED` para essa atividade.

## Decisão

- Persistir `ACTIVITY_CREATED` v1 para o follow-up na mesma transação local da
  entrega do contrato.
- Reutilizar a auditoria `CONTRACT_DELIVERED`; não criar auditoria separada.
- Usar a atividade como agregado e payload mínimo `activityId`, `auditEventId`,
  `customerId` e `opportunityId`.
- Correlacionar pelo `requestId` recebido pela API e deduplicar por
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Preservar canal, destinatário, notas, gates, estado, autorização e resposta
  atuais.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; reutilizar `IntegrationOutbox` e `AuditEvent` existentes.
- Falha ao gravar o evento filho reverte entrega, estado, follow-up e auditoria.
- A importação de contas permanece manual conforme ADR-008; OCR não é
  dependência deste incremento.

## Evidência necessária para R1-33

Integração comprova payload mínimo, correlação, deduplicação e rollback integral;
`pnpm check`, CI, links, Prettier e `git diff --check`.
