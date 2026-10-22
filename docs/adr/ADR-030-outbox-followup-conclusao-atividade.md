# ADR-030 — Outbox para follow-up da conclusão de atividade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-30; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`completeActivity` pode concluir uma atividade e criar um follow-up opcional na
mesma transação. R1-26 registra `ACTIVITY_COMPLETED`, incluindo o ID do
follow-up, mas não registra o fato de criação da atividade filha.

## Decisão

- Quando a conclusão criar uma atividade seguinte, persistir também
  `ACTIVITY_CREATED` v1 na mesma transação local.
- Reutilizar a auditoria `commercial.activity_completed`, sem gravar uma segunda
  auditoria para a atividade filha.
- Usar a atividade filha como agregado e payload composto somente por
  `activityId`, `auditEventId` e vínculos presentes `customerId`/
  `opportunityId`.
- Correlacionar com o `requestId`; deduplicar com
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Preservar o evento `ACTIVITY_COMPLETED` e seu `nextActivityId` atual.
- Sem `nextActivity`, não criar evento `ACTIVITY_CREATED` adicional.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; R1-30 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao gravar o evento filho reverte conclusão, follow-up, auditoria e evento
  pai.
- Importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-30

Integração verifica pai/filho, auditoria compartilhada, correlação, payload
mínimo, ausência do evento adicional sem follow-up e rollback integral;
`pnpm check`, CI, links e `git diff --check`.
