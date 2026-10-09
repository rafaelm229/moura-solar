# ADR-035 — Outbox para criação e atualização do catálogo

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-35; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-016, SPEC-017 e SPEC-019

## Contexto

`createCatalogItem` e `updateCatalogItem` já persistem `CatalogItem` e a
auditoria correspondente na mesma transação local. Ainda não registram fatos de
integração para esses comandos.

## Decisão

- Persistir `CATALOG_ITEM_CREATED` v1 e `CATALOG_ITEM_UPDATED` v1 com cada
  comando, na mesma transação local que grava o item e a auditoria.
- Usar `CatalogItem` como agregado e payload mínimo `{ catalogItemId,
auditEventId, version }`; a versão fica no payload porque a tabela atual de
  `IntegrationOutbox` não possui coluna `aggregateVersion`.
- Correlacionar pelo `requestId` recebido pela API e deduplicar por tipo,
  auditoria, item e versão.
- Não incluir SKU, preço/custo, estoque, fornecedor, classificação fiscal,
  dados técnicos ou documentos no payload.
- Preservar endpoints, autorização, auditoria, concorrência otimista e resposta.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; reutilizar `IntegrationOutbox`, `AuditEvent` e
  `CatalogItem` existentes.
- Falha ao gravar o evento reverte cadastro/atualização e auditoria na transação
  PostgreSQL.
- CatalogItem continua dono do cadastro; estoque e preço continuam projeções dos
  seus domínios, conforme SPEC-017.

## Evidência necessária para R1-35

Integração comprova os dois eventos, correlação, dedupe e rollback por falha
forçada em cada tipo; `pnpm check`, CI, links, Prettier e `git diff --check`.
