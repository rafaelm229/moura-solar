# ADR-020 — Outbox local para arquivamento e restauração de cliente

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-20; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.archiveCustomer` valida a versão esperada e impede o
arquivamento enquanto existirem oportunidades ativas; `restoreCustomer` valida
a versão e restaura o status. Ambos atualizam o cliente e registram auditoria na
mesma transação local. A autorização é aplicada nos endpoints atuais.

## Decisão

- Persistir `CUSTOMER_ARCHIVED` v1 e `CUSTOMER_RESTORED` v1 na `IntegrationOutbox`
  dentro das transações locais existentes.
- Preservar permissões, validação de oportunidades ativas, concorrência otimista,
  versões, estados e efeitos atuais.
- Usar Customer como agregado e `requestId` como correlação.
- Payload contém `customerId` e `auditEventId`; não inclui dados pessoais nem
  motivo/texto de operação.
- Deduplicar cada fato pelo ID imutável da auditoria
  (`CUSTOMER_ARCHIVED:<auditEventId>` / `CUSTOMER_RESTORED:<auditEventId>`).
- Manter os eventos não publicados, sem dispatcher, consumidor, broker ou
  chamada externa.

## Consequências e controles

- Nenhuma migration: R1-20 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao gravar evento reverte estado, versão, `archivedAt` e auditoria da
  operação correspondente.
- O histórico de arquivamentos/restaurações é preservado em auditoria; não se
  cria fonte paralela de estado.
- A importação de contas permanece manual conforme ADR-008, fora deste escopo.

## Evidência necessária para R1-20

Testes de contrato e integração com autorização, gates, correlação, vínculo à
auditoria, payload mínimo, `publishedAt` nulo e rollback forçado em arquivamento
e restauração; `pnpm check`, CI completa, links locais e `git diff --check`.
