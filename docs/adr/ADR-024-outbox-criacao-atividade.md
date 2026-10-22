# ADR-024 — Outbox local para criação de atividade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-24; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.createActivity` já cria a atividade e grava a auditoria na
mesma transação local. A rota exige `activities:manage` e propaga o `requestId`.
O fluxo ainda não persiste um fato de integração para a atividade.

## Decisão

- Persistir `ACTIVITY_CREATED` v1 na transação local existente.
- Preservar autorização, organização, campos, regras e resposta HTTP atuais.
- Usar Activity como agregado e `requestId` como correlação.
- O payload contém `activityId`, `auditEventId` e, quando presentes, `customerId`
  e `opportunityId`.
- Não incluir assunto, descrição, tipo, responsável, vencimento ou resultado.
- Deduplicar pelo ID imutável da auditoria (`ACTIVITY_CREATED:<auditEventId>`).
- Manter o evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-24 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir a outbox reverte atividade e auditoria.
- A atividade continua sujeita à permissão de gestão já aplicada na API.
- O evento documenta uma criação aceita; não replica estado nem escolhe um dono
  futuro dos dados.
- A importação de contas segue manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-24

Testes de contrato e integração para autorização, correlação, vínculo à auditoria,
links opcionais, payload mínimo, `publishedAt` nulo e rollback forçado; `pnpm
check`, CI completa, links locais e `git diff --check`.
