# R1-35 — Outbox para criação e atualização do catálogo

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado em branch `codex/r1-35-catalog-events`; validação local
concluída, aguardando CI.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md),
[SPEC-017](../specs/SPEC-017-catalogo-produtos/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-035](adr/ADR-035-outbox-eventos-catalogo.md).

**Dependências:** R1-05, R1-08, R1-09 e R1-34 consolidados; os comandos de
CatalogItem e suas auditorias já usam transações locais.

## Diferenças antes/depois

- **Antes:** criar/atualizar CatalogItem e auditar são transacionais, sem evento
  de integração.
- **Depois (escopo autorizado):** os comandos persistem `CATALOG_ITEM_CREATED`
  v1 ou `CATALOG_ITEM_UPDATED` v1, atomicamente com item e auditoria.
- **Contrato:** agregado `CatalogItem`; payload mínimo `catalogItemId`,
  `auditEventId`, `version` (versão persistida do item);
  `correlationId` vem de `requestId`; dedupe usa tipo, auditoria, item e versão.
- **Privacidade/propriedade:** sem SKU, valores, saldo, fornecedor, fiscal,
  atributos técnicos ou documentos. CatalogItem conserva o dono do cadastro;
  preço e estoque continuam donos das respectivas projeções.
- **Migração:** nenhuma. Reutiliza `IntegrationOutbox` e `AuditEvent`.
- **Ativação:** sem publicação ou consumidor.

## Critérios de aceite

- Criar e atualizar persistem o evento correto com auditoria, versão, correlação,
  dedupe e payload mínimo.
- Falha forçada em cada tipo reverte item, versão, auditoria e evento da
  transação.
- Preservar autorização, conflito de SKU, concorrência otimista e respostas.
- Validar integração PostgreSQL, `pnpm check`, Prettier, links e
  `git diff --check`; não alegar CI verde sem resultado observado.

## Evidências

- `pnpm check`: exit code 0 (formatação, lint, typecheck, testes e build).
- `node --test --test-concurrency=1 tests/design.integration.mjs`: 10/10,
  incluindo correlação, payload mínimo e rollback de criação/atualização no
  PostgreSQL local com schema isolado.
- `pnpm --filter @moura-solar/contracts test`: 60/60; build da API concluído.
- `git diff --check`: sem erros. CI remota ainda não executada; não declarado
  consolidado nem liberado.

## Rollback

Remover somente as duas gravações de eventos e seus contratos/testes. Nenhuma
migration ou evento pai precisa de reversão; manter os comandos atuais do
catálogo.
