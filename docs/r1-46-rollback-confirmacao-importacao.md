# R1-46 — Atomicidade da confirmação manual quando falha a outbox

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #98, merge `8a06bab`; CI run `38019743039` verde.

**SPECs:** [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md),
requisito IMP-07; [SPEC-019](../specs/SPEC-019-eventos-dados/spec.md), critério
EVT-01; família F-34.

**Decisão vigente:** [ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md).

**Dependências:** transação local de confirmação já existente; R1-45 prova
durabilidade da confirmação aplicada após reinício.

## Protocolo do incremento

- **Antes:** testes cobriam confirmação, aplicação, concorrência e replay em
  condições normais. Não havia falha injetada ao inserir o evento
  `ENERGY_BILL_IMPORT_APPLIED` para demonstrar rollback de todos os efeitos.
- **Depois (R1-46):** o teste de integração instala trigger temporário que rejeita
  somente esse evento, envia uma confirmação humana válida e verifica HTTP 500 e
  ausência total de aplicação. Remove o trigger e confirma a mesma revisão com
  outra chave de idempotência.
- **Contratos:** nenhum endpoint, payload, parser ou formato dos eventos muda.
  A linha de intake segue no `ImportOutbox` legado; o evento `APPLIED` só aparece
  na confirmação bem-sucedida.
- **Migração compatível:** nenhuma; o trigger existe apenas no schema temporário
  do teste e é removido em `finally`.
- **Execução:** sem worker, consumidor, polling, extração, OCR ou chamada externa.
- **Rollback:** remover as asserções e as referências documentais; nenhuma
  mudança de runtime, contrato ou banco a reverter.

## Critérios de aceite

- A falha do insert de `ENERGY_BILL_IMPORT_APPLIED` retorna erro e preserva
  `REVIEW_REQUIRED` e a versão da importação.
- Não ficam `ImportApplication`, leituras/revisões aplicadas, transição de
  confirmação, auditoria de aplicação ou evento `APPLIED`.
- A linha `QUEUED` existente continua intacta.
- Retirada a falha injetada, a confirmação se aplica integralmente e os testes
  existentes de replay permanecem passando.

## Validação

- `node --test --test-concurrency=1 tests/energy-import.integration.mjs` — passou
  com 8/8 cenários, incluindo falha de outbox, rollback e confirmação posterior.
- `pnpm test:integration` — passou com 125/125 cenários.
- `pnpm check` — passou: formatação, lint, typecheck, testes e build.
- Formatação dos documentos, links locais e `git diff --check` — passaram.
- CI do PR #98 — passou no run `38019743039` (incluiu `pnpm check`, migrações,
  integração e E2E); PR consolidado por squash em `8a06bab1c7fa8100b53a2a46076c630cd4184e90`.

## Limites

O teste comprova atomicidade no produtor local quando o insert da outbox falha.
Não prova entrega, inbox, retry, replay de consumidor, compensação distribuída
ou processamento OCR.
