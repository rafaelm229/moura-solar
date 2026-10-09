# ADR-025 — Outbox local para cancelamento de atividade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-25; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.cancelActivity` verifica organização, versão esperada e
estado aberto, atualiza a atividade e grava auditoria na mesma transação local.
A rota exige `activities:manage`. Ainda não é persistido um evento de integração
para o cancelamento aceito.

## Decisão

- Persistir `ACTIVITY_CANCELED` v1 na transação local existente.
- Preservar autorização, organização, concorrência otimista, status, versão,
  regras e resposta HTTP atuais.
- Usar Activity como agregado e `requestId` como correlação.
- O payload contém `activityId`, `auditEventId` e, quando presentes, `customerId`
  e `opportunityId`.
- Não incluir assunto, descrição, tipo, responsável, vencimento ou justificativa.
- Deduplicar pelo ID imutável da auditoria
  (`ACTIVITY_CANCELED:<auditEventId>`).
- Manter o evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-25 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir a outbox reverte cancelamento e auditoria.
- Versão obsoleta ou atividade fechada não gera novo evento.
- A importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-25

Testes de contrato e integração para autorização, versão, correlação, vínculo à auditoria,
payload mínimo, `publishedAt` nulo e rollback forçado; `pnpm check`, CI completa,
links locais e `git diff --check`.
