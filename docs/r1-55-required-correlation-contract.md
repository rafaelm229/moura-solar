# R1-55 — Tipo obrigatório da correlação nos contratos v1

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #116 em `917e08a`; CI run `38064576360` verde.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-53 verifica a presença do campo conforme o contrato; R1-54
fixa a versão literal v1.

## Protocolo do incremento

- **Antes:** a verificação R1-53 distinguia contratos com e sem `correlationId`,
  mas não detectava quando o campo compartilhado se tornava opcional ou deixava
  de ser uma string.
- **Depois:** o checker TypeScript inspeciona a propriedade efetiva de cada
  contrato v1 que usa o envelope compartilhado e exige `correlationId` obrigatório
  do tipo `string`. Contratos legados de importação, sem essa propriedade,
  permanecem fora da regra.
- **Contratos:** nenhuma declaração, payload, parser de runtime ou endpoint foi
  alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** toda declaração v1 que contenha `correlationId` o mantém requerido
  e como string; não há lista paralela de eventos.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test packages/contracts/tests/event-metadata.test.mjs` — passou.
- `pnpm --filter @moura-solar/contracts test` — build TypeScript e 11/11 arquivos
  de teste passaram.
- CI completa passou: `pnpm check`, geração da API, migrations, integração e E2E
  (run `38064576360`).

## Limites

O incremento só verifica os tipos de contrato existentes. Não altera contratos
ou runtime e não ativa transporte, worker, broker ou consumidor. Importação de
contas continua manual conforme ADR-008.
