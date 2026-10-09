# ADR-031 — Outbox para follow-up de entrega de proposta

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-31; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-001, SPEC-006, SPEC-016 e SPEC-019

## Contexto

Registrar entrega de proposta atualiza a versão e, no fluxo existente, cria uma
atividade de follow-up. R1-14 já persiste `PROPOSAL_DELIVERED`, mas o fato da
atividade criada no mesmo comando ainda não é registrado.

## Decisão

- Quando registrar uma entrega de proposta, persistir também `ACTIVITY_CREATED`
  v1 para o follow-up automático na mesma transação local.
- Reutilizar a auditoria `PROPOSAL_DELIVERED` existente; não gravar auditoria
  separada para o follow-up.
- Usar a atividade como agregado e payload mínimo com `activityId`,
  `auditEventId`, `customerId` e `opportunityId`.
- Correlacionar com o `requestId`; deduplicar com
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Preservar `PROPOSAL_DELIVERED`, gates, envio manual, transição de oportunidade,
  entrega, atividade existente e resposta atuais.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; R1-31 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao gravar o evento filho reverte entrega, atualização da versão,
  atividade, auditoria e evento pai.
- Importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-31

Integração verifica evento pai/filho, auditoria, correlação, payload mínimo e
rollback integral; `pnpm check`, CI, links e `git diff --check`.
