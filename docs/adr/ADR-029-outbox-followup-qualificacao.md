# ADR-029 — Outbox para atividade de follow-up da qualificação

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-29; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`qualifyOpportunity` pode criar uma atividade de follow-up junto à transição para
`QUALIFICADO`. R1-16 registra `OPPORTUNITY_QUALIFIED`; R1-24 cobre atividade
criada pelo endpoint independente e R1-28 cobre a primeira atividade da criação
da oportunidade. O follow-up da qualificação ainda não tem fato próprio.

## Decisão

- Quando o comando cria `nextActivity`, persistir também `ACTIVITY_CREATED` v1 na
  mesma transação local.
- Reutilizar a auditoria `commercial.opportunity_qualified` do comando, sem
  adicionar uma segunda linha de auditoria.
- Usar Activity como agregado. O payload contém `activityId`, `auditEventId`,
  `customerId` e `opportunityId`; sem assunto, descrição, tipo, responsável ou
  vencimento.
- Correlacionar com o `requestId`; deduplicar com
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Preservar evento `OPPORTUNITY_QUALIFIED`, gates, transição e resposta atuais.
- Sem `nextActivity`, não criar evento `ACTIVITY_CREATED`.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; R1-29 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir o evento filho reverte qualificação, follow-up, transição,
  auditoria e evento pai.
- Importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-29

Integração verifica evento de qualificação e evento de atividade, auditoria
compartilhada, correlação, payload mínimo, ausência do filho sem follow-up e
rollback integral; `pnpm check`, CI completa, links e `git diff --check`.
