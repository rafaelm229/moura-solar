# R1-52 — Paridade automática entre produtores e contratos de eventos

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado em branch `codex/r1-52-contract-parity`; CI pendente.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-44 comparou os 32 nomes de produtores e contratos por
auditoria manual; `packages/contracts` já depende de TypeScript para validação.

## Protocolo do incremento

- **Antes:** a paridade entre produtores da API e contratos v1 foi conferida
  estaticamente no R1-44, mas uma alteração futura podia deixar os conjuntos
  divergentes sem falhar o teste do pacote.
- **Depois:** um teste deriva, pela AST TypeScript, os eventos dos produtores da
  API, os tipos declarados nos contratos, os tipos cobertos por parsers v1
  exportados e a superfície reexportada pelo pacote. Não mantém lista manual de
  eventos.
- **Contratos:** nenhum evento, payload, parser de runtime ou endpoint foi
  alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** conjuntos de produtores e tipos são iguais; cada evento produzido
  aparece em parser v1 exportado; todos os parsers v1 públicos são reexportados.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test packages/contracts/tests/event-producer-contracts.test.mjs` —
  passou; `pnpm --filter @moura-solar/contracts test` passou build TypeScript e
  10/10 arquivos de teste.
- Prettier nos arquivos afetados, links locais e `git diff --check` — passaram.
- `pnpm check` local parou em `prettier --check .` por artefatos não rastreados
  em `.vscode/mcp.json` e `moura-solar-specs-roadmap/`; esses caminhos foram
  preservados sem edição. CI completo — pendente.

## Limites

A verificação prova cobertura estática dos nomes e da superfície pública; não
substitui os testes de payload de cada parser, não prova semântica de consumidor e
não ativa publicação, worker, broker ou processamento.
