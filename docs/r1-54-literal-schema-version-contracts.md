# R1-54 — Versão literal nos contratos v1

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #114 em `d811194`; CI run `38063156490` verde.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-52 cobre paridade dos nomes de eventos e parsers; R1-53
protege versão/correlação dos produtores. Este incremento protege a declaração
TypeScript de cada contrato v1.

## Protocolo do incremento

- **Antes:** o teste R1-53 exigia `schemaVersion: 1` nos objetos produzidos, mas
  não falhava se o tipo de contrato v1 ampliasse sua propriedade para `number`.
- **Depois:** o teste usa o checker TypeScript para derivar a propriedade
  `schemaVersion` de cada tipo `*EventV1` e exige que seja o literal numérico `1`.
- **Contratos:** nenhuma declaração, payload, parser de runtime ou endpoint foi
  alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** todo tipo de evento v1 fixa `schemaVersion` no literal `1`; o
  teste compara contratos existentes, sem lista paralela de eventos.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test packages/contracts/tests/event-metadata.test.mjs` — passou.
- `pnpm --filter @moura-solar/contracts test` — build TypeScript e 11/11 arquivos
  de teste passaram.
- CI completa passou: `pnpm check`, geração da API, migrations, integração e E2E
  (run `38063156490`).

## Limites

O incremento valida declarações de tipos e produtores estáticos. Não muda o
runtime, não altera contratos e não ativa transporte, worker, broker ou
consumidor. A importação de contas continua manual conforme ADR-008.
