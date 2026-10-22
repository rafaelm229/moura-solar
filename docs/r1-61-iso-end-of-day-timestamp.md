# R1-61 — Timestamp ISO no fim do dia

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado em `feat/proposal-visual-clarity` pelo PR #129, merge
`57e6579eb56746bcda18e7f9110a3673ab3d3f08`, em 22/10/2026.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependência:** R1-60 valida datas de calendário, inclusive anos bissextos.

## Protocolo do incremento

- **Antes:** o formato do envelope aceita componentes `24:00:00`, mas
  `Date.parse` rejeita esse instante no JavaScript. A emenda
  [ISO 8601-1:2019/Amd 1:2022](https://www.iso.org/standard/81801.html)
  reconhece a representação do fim do dia.
- **Depois:** o parser aceita `24:00:00` somente com minutos e segundos zero e
  fração opcional composta de zeros, mantendo a validação da data e do fuso.
- **Rejeições:** `24:00:01`, `24:01:00` e frações não zero continuam inválidas.
- **Contratos:** amplia a aceitação para uma representação ISO válida; não
  altera campos, payload, IDs, persistência ou consumidores.
- **Migração compatível:** nenhuma; sem alteração de schema ou dados.
- **Aceite:** aceitar `2024-02-29T24:00:00.000-03:00`; rejeitar componentes
  incompatíveis com o fim exato do dia; preservar timestamps existentes.
- **Rollback:** reverter o reconhecimento explícito de fim do dia e seus testes;
  sem efeito persistido.

## Validação

- `pnpm --filter @moura-solar/contracts test`: passou, 11/11 arquivos de teste.
- Prettier dos arquivos afetados e `git diff --check`: passaram.
- `pnpm check`: bloqueado antes dos demais gates porque o Prettier global aponta
  7 arquivos preexistentes e não rastreados do usuário em `.vscode/` e
  `moura-solar-specs-roadmap/`; esses arquivos foram preservados sem alterações.
- CI completa aprovada no [run 38074838184](https://github.com/rafaelm229/moura-solar/actions/runs/38074838184): check, OpenAPI, migrations, integração e E2E.
- PR #129 consolidado em 22/10/2026. A candidata limpa de promoção passou em
  `pnpm check`; a execução histórica bloqueada acima permanece como registro.
- Testes de contratos reexecutados em cópia isolada do SHA `6f4abfd`: 85/85 passaram.

## Limites

Este incremento só amplia a validação do timestamp do envelope. Não ativa
transporte nem consumidores. A importação de contas continua manual conforme
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md).
