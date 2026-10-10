# R1-58 — Limites de tipo do payload do envelope

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado na branch `codex/r1-58-payload-object`.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-56 e R1-57 cobrem o envelope e seus metadados; este
incremento cobre os tipos de entrada inválidos do payload no parser atual.

## Protocolo do incremento

- **Antes:** a suíte verificava somente array como payload inválido.
- **Depois:** testes cobrem payload ausente e valores `null`, array, string,
  número e booleano; somente objetos permanecem aceitos pelo parser.
- **Contratos:** nenhuma declaração, parser de runtime ou payload foi alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** valores que não são objetos são rejeitados pelo parser existente,
  mantendo a aceitação de objetos e sem mudar o comportamento runtime.
- **Rollback:** remover os casos adicionais e este relatório; sem efeito
  persistido ou serviço a reverter.

## Validação

- `node --test packages/contracts/tests/integration-event.test.mjs` — passou.
- `pnpm --filter @moura-solar/contracts test` — build TypeScript e 11/11 arquivos
  de teste passaram.
- Prettier dos arquivos afetados, links locais e `git diff --check` — passaram.
- `pnpm check` local parou no Prettier por sete arquivos não rastreados
  preexistentes em `.vscode/` e `moura-solar-specs-roadmap/`; permanecem intactos.
- CI completa — pendente.

## Limites

Este incremento protege o parser já existente sem mudar seu comportamento. Não
altera transporte, contratos de domínio, banco, worker, broker ou consumidor. A
importação de contas continua manual conforme
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md).
