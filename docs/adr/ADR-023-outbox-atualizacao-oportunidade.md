# ADR-023 — Outbox local para atualização de oportunidade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-23; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.updateOpportunity` valida organização e versão esperada,
atualiza campos comerciais da oportunidade e grava auditoria na mesma transação
local. O endpoint exige `opportunities:update`. O fluxo ainda não registra um
evento durável na outbox.

## Decisão

- Persistir `OPPORTUNITY_UPDATED` v1 na transação local existente.
- Preservar autorização, organização, controle de versão, estado/gates, regras e
  resposta HTTP atuais.
- Usar Opportunity como agregado e `requestId` como correlação.
- Payload contém `opportunityId`, `customerId` e `auditEventId`; não inclui
  título, necessidade, consumo, prioridade, data prevista, responsável nem
  quaisquer outros dados comerciais.
- Deduplicar pelo ID imutável da auditoria
  (`OPPORTUNITY_UPDATED:<auditEventId>`).
- Manter evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-23 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao gravar evento reverte atualização, versão e auditoria.
- Requisição com versão obsoleta não atualiza oportunidade nem cria evento.
- O evento registra a atualização aceita; não replica estado nem define o dono
  futuro dos dados.
- A importação e leitura de contas seguem manuais conforme ADR-008.

## Evidência necessária para R1-23

Testes de contrato e integração para permissão, correlação, vínculo à auditoria,
payload mínimo, `publishedAt` nulo, rollback forçado, gates preservados e conflito
de versão; `pnpm check`, CI completa, links locais e `git diff --check`.
