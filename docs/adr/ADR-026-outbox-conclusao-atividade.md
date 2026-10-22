# ADR-026 — Outbox local para conclusão de atividade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-26; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.completeActivity` valida organização, versão e estado aberto,
conclui a atividade e, opcionalmente, cria uma próxima atividade na mesma
transação local. A auditoria também é local; a rota exige `activities:manage`.
Ainda não há evento durável para a conclusão.

## Decisão

- Persistir `ACTIVITY_COMPLETED` v1 na transação local já usada pelo comando.
- Preservar autorização, organização, versão, estado, resultado, encadeamento e
  resposta atuais.
- Usar Activity como agregado e `requestId` como correlação.
- Payload contém `activityId`, `auditEventId`, vínculos presentes `customerId` /
  `opportunityId` e, quando criada, `nextActivityId`.
- Não incluir código/observação de resultado, assunto/descrição, tipo,
  responsável ou vencimento de nenhuma atividade.
- Deduplicar pelo ID imutável da auditoria
  (`ACTIVITY_COMPLETED:<auditEventId>`).
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration: R1-26 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir evento reverte conclusão, próxima atividade e auditoria.
- Versão obsoleta ou atividade fechada não cria evento.
- Importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-26

Contrato e integração verificam autorização, versão, vínculos opcionais,
correlação, payload mínimo, `publishedAt` nulo e rollback incluindo próxima
atividade; `pnpm check`, CI completa, links locais e `git diff --check`.
