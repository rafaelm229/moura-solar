# R1-57 — Metadados opcionais e objeto do envelope

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #120, merge `4820783`.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-56 cobre campos textuais obrigatórios; este incremento cobre
os limites já implementados para o envelope completo e seus metadados opcionais.

## Protocolo do incremento

- **Antes:** a suíte exercitava uma versão zero inválida e um `aggregateVersion`
  negativo, mas não cobria formato não objeto, limites numéricos, metadados
  opcionais inválidos ou a ausência permitida desses campos.
- **Depois:** testes garantem que `schemaVersion` e `aggregateVersion` aceitem
  somente inteiros positivos seguros quando presentes; `causationId` deve ser
  texto não vazio quando presente; ausência de `aggregateVersion` e
  `causationId` continua válida; e o parser rejeita valores que não sejam objetos.
- **Contratos:** nenhuma declaração, parser de runtime ou payload foi alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** os limites atuais de validação têm casos positivos e negativos,
  sem tornar obrigatórios os campos opcionais nem mudar o comportamento runtime.
- **Rollback:** remover os testes e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test packages/contracts/tests/integration-event.test.mjs` — passou.
- `pnpm --filter @moura-solar/contracts test` — build TypeScript e 11/11 arquivos
  de teste passaram.
- Prettier dos arquivos afetados, links locais e `git diff --check` — passaram.
- `pnpm check` local parou no Prettier por sete arquivos não rastreados
  preexistentes em `.vscode/` e `moura-solar-specs-roadmap/`; permanecem intactos.
- CI completa — passou no run `38068246864`, incluindo check, geração da API,
  migrations, integração e E2E.

## Limites

Este incremento protege o parser já existente sem mudar seu comportamento. Não
altera transporte, contratos de domínio, banco, worker, broker ou consumidor. A
importação de contas continua manual conforme
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md). A CI executou a suíte de
migrations existente, sem alteração de banco neste incremento.
