# ADR-021 — Outbox local para atualização de unidade consumidora

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-21; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.updateUtilityUnit` valida a versão esperada, atualiza a
unidade consumidora com incremento de versão e grava auditoria na mesma
transação local. O endpoint exige `consumer_units:manage`. O fluxo ainda não
registra um fato durável na outbox.

## Decisão

- Persistir `UTILITY_UNIT_UPDATED` v1 na transação local existente.
- Preservar autorização, organização, controle de versão, regras de atualização
  e resposta HTTP atuais.
- Usar UtilityUnit como agregado e o `requestId` como correlação.
- Payload contém `utilityUnitId`, `customerId` e `auditEventId`; não inclui
  distribuidora, código externo da conta, classe, tarifa, conexão, tensão ou
  outros dados de negócio.
- Deduplicar pelo ID imutável da auditoria (`UTILITY_UNIT_UPDATED:<auditEventId>`).
- Manter evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-21 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao gravar evento reverte atualização, versão e auditoria.
- Requisição com versão obsoleta não atualiza a UC nem cria evento.
- O evento registra a atualização confirmada; não replica o estado da UC nem
  define proprietário futuro dos dados.
- Importação e leitura de contas permanecem manuais conforme ADR-008.

## Evidência necessária para R1-21

Testes de contrato e integração para permissão, correlação, vínculo à auditoria,
payload mínimo, `publishedAt` nulo, rollback forçado e conflito de versão;
`pnpm check`, CI completa, links locais e `git diff --check`.
