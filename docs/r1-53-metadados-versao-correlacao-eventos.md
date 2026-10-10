# R1-53 — Versão e correlação dos eventos produzidos

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado em branch `codex/r1-53-event-metadata`; CI pendente.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-52 guarda a paridade de produtores, tipos, parsers e
reexports; contratos v1 definem a forma de correlação.

## Protocolo do incremento

- **Antes:** R1-03 e R1-44 documentaram versionamento e cobertura de contratos,
  mas não havia regressão estrutural para impedir que um produtor omitisse
  `schemaVersion: 1` ou divergisse do campo de correlação declarado pelo tipo.
- **Depois:** testes AST inspecionam cada objeto de evento da API e usam o
  compilador TypeScript para derivar se o contrato correspondente inclui
  `correlationId`. Eventos do envelope compartilhado precisam fornecê-lo; os
  contratos legados de importação continuam sem esse campo no payload porque a
  correlação é persistida separadamente na coluna `ImportOutbox`.
- **Contratos:** nenhum evento, payload, parser de runtime ou endpoint foi
  alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** cada produtor usa `schemaVersion: 1`; presença de correlação no
  objeto produzido corresponde à forma do contrato v1, sem exceção codificada em
  lista paralela.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test packages/contracts/tests/event-metadata.test.mjs` — passou.
- `pnpm --filter @moura-solar/contracts test` — passou build TypeScript e
  11/11 arquivos de teste.
- Prettier nos arquivos afetados, links locais e `git diff --check` — passaram.
- `pnpm check` local parou em `prettier --check .` por artefatos não rastreados
  em `.vscode/mcp.json` e `moura-solar-specs-roadmap/`; foram preservados sem
  edição. CI completo — pendente.

## Limites

O teste cobre campos estruturais em código estático. Não valida valor de
correlação em runtime, semântica de consumidor ou entrega, e não ativa transporte,
worker, broker ou processamento.
