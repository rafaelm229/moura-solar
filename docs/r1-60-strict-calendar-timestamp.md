# R1-60 — Datas válidas no timestamp do envelope

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #126, commit `d10578c`.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-56 a R1-59 cobrem outros campos e limites do envelope.
Este incremento corrige a aceitação de dias impossíveis no timestamp.

## Protocolo do incremento

- **Antes:** o parser verificava formato ISO e `Date.parse`, mas a implementação
  JavaScript normaliza datas como 30 de fevereiro; o envelope era aceito.
- **Depois:** além da forma ISO e do parse de horário/fuso, o parser valida
  mês, dia e ano bissexto. Datas impossíveis são rejeitadas; 29 de fevereiro em
  ano bissexto continua aceito.
- **Contratos:** nenhuma declaração, formato válido ou payload foi alterado. A
  validação apenas rejeita datas de calendário inválidas.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados persistidos.
- **Aceite:** rejeitar `2026-02-30` e `2025-02-29`, aceitar
  `2024-02-29`, e manter ISO inválido rejeitado.
- **Rollback:** reverter a validação de calendário e este relatório; sem efeito
  persistido ou serviço a reverter.

## Validação

- `pnpm --filter @moura-solar/contracts test`: passou, 11/11 arquivos de teste.
- Prettier dos arquivos afetados e `git diff --check`: passaram.
- Links Markdown locais dos cinco documentos afetados: passaram; todos os alvos
  existem.
- `pnpm lint`, `pnpm typecheck` e `pnpm build`: passaram.
- `pnpm test`: 1.255 testes passaram e 2 testes preexistentes de DOCX falharam
  porque o sandbox bloqueou `spawnSync unzip` com `EPERM`; os testes do parser e
  do pacote de contratos passaram. CI completa ainda é necessária para validar
  os testes DOCX no ambiente de integração.
- `pnpm check`: bloqueado antes de lint/typecheck/test/build porque a verificação
  global encontrou formatação pendente em 7 arquivos preexistentes e não
  rastreados do usuário (`.vscode/mcp.json` e `moura-solar-specs-roadmap/`).
  Esses arquivos foram preservados sem alterações.
- CI completa passou no run `38073001087`, incluindo `pnpm check`, migrations,
  integrações e E2E. PR #126 consolidado em `d10578c`.

## Limites

O incremento valida somente o parser do envelope compartilhado. Não muda
produtores, transporte, banco, worker, broker ou consumidor. A importação de
contas continua manual conforme
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md).
