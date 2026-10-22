# ADR-036 — Evento para registro manual de entrega de contrato

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-36; transporte e consumidores ficam fora do
incremento.

**Escopo:** R1, SPEC-007, SPEC-016 e SPEC-019

## Contexto

`recordDelivery` registra manualmente uma entrega, atualiza o estado do contrato,
cria uma atividade de acompanhamento e grava a auditoria `CONTRACT_DELIVERED`.
O evento `ACTIVITY_CREATED` da atividade já é persistido na mesma transação.

## Decisão

- Persistir `CONTRACT_DELIVERED` v1 na mesma transação local da entrega,
  atualização de estado, atividade, auditoria e evento de atividade.
- Usar o contrato como agregado; payload mínimo `{ contractId, deliveryId,
auditEventId, opportunityId }`.
- Correlacionar pelo `requestId` e deduplicar por auditoria e delivery ID.
- O fato representa o registro manual feito pela pessoa; não envia documento nem
  chama canal externo.
- Não incluir canal, destinatário, notas ou conteúdo do contrato.
- Preservar as regras de pagamento, estado, autorização, resposta e follow-up.

## Consequências e controles

- Nenhuma migration; reutiliza `IntegrationOutbox`, `ContractDelivery` e
  `AuditEvent` existentes.
- Falha ao gravar o evento reverte entrega, estado, atividade, auditoria e evento
  de atividade na transação PostgreSQL.
- Não ativa dispatcher, consumidor ou broker.

## Evidência necessária para R1-36

Integração comprova contrato mínimo, correlação, dedupe e rollback por falha
forçada em `CONTRACT_DELIVERED`; `pnpm check`, CI, links, Prettier e
`git diff --check`.
