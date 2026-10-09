# ADR-028 — Outbox para primeira atividade criada com oportunidade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-28; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`createOpportunity` cria oportunidade e primeira atividade na mesma transação.
R1-08 registra `OPPORTUNITY_CREATED`, mas o fato filho não tem evento próprio;
R1-24 cobre somente o endpoint independente de atividade. O comando grava uma
auditoria `commercial.opportunity_created` para a transação completa.

## Decisão

- Persistir também `ACTIVITY_CREATED` v1 para a primeira atividade, na transação
  local de criação da oportunidade.
- Reutilizar o ID da auditoria do comando que cobre oportunidade e primeira
  atividade; não adicionar nova linha de auditoria nem mudar resposta.
- Usar Activity como agregado. O payload contém `activityId`, `auditEventId`,
  `customerId` e `opportunityId`; sem assunto, descrição, tipo, responsável ou
  vencimento.
- Correlacionar com o `requestId`; deduplicar com
  `ACTIVITY_CREATED:<auditEventId>:<activityId>` para diferenciar fatos de
  atividade no mesmo comando.
- Preservar o evento `OPPORTUNITY_CREATED` existente e todas as regras do comando.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; R1-28 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir o evento filho reverte oportunidade, atividade, transição,
  auditoria e evento de oportunidade.
- Importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-28

Integração verifica evento pai e filho, IDs vinculados, auditoria compartilhada,
correlação, payload mínimo, `publishedAt` nulo e rollback integral; `pnpm check`,
CI completa, links locais e `git diff --check`.
