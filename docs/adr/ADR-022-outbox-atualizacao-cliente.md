# ADR-022 — Outbox local para atualização de cliente

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-22; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.updateCustomer` valida organização e versão esperada,
atualiza dados cadastrais e grava auditoria na mesma transação local. O endpoint
exige `customers:update`. O fluxo ainda não registra um evento de integração.

## Decisão

- Persistir `CUSTOMER_UPDATED` v1 na transação local existente.
- Preservar autorização, organização, controle de versão, regras de atualização
  e resposta HTTP atuais.
- Usar Customer como agregado e o `requestId` como correlação.
- Payload contém `customerId` e `auditEventId`; não inclui nome, documento,
  observações ou quaisquer outros dados cadastrais/comerciais.
- Deduplicar pelo ID imutável da auditoria (`CUSTOMER_UPDATED:<auditEventId>`).
- Manter evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-22 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao gravar evento reverte atualização, versão e auditoria.
- Requisição com versão obsoleta não altera cliente nem cria evento.
- O evento não replica estado nem define proprietário futuro dos dados.
- A importação e leitura de contas seguem manuais conforme ADR-008.

## Evidência necessária para R1-22

Testes de contrato e integração para permissão, correlação, vínculo à auditoria,
payload mínimo, `publishedAt` nulo, rollback forçado e conflito de versão;
`pnpm check`, CI completa, links locais e `git diff --check`.
