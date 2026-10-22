# R1-45 — Durabilidade da importação manual após reinício

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #97, merge `398421f37fa5a6e10cb7a319c0b289be001ffa6b`.

**SPECs:** [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md), critério EVT-01; famílias
F-23 e F-34.

**Decisão vigente:** [ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md).

**Dependências:** R1-02/03/04 para correlação, versão e contrato do `ImportOutbox`;
R1-43 como precedente de restart para `IntegrationOutbox`.

## Protocolo do incremento

- **Antes:** o fluxo de confirmação manual verificava persistência da importação,
  leituras, recibo, auditoria e outbox enquanto a API permanecia ativa. O restart
  abrupto do R1-43 cobria eventos de contrato em `IntegrationOutbox`, não a
  outbox legada vinculada à importação.
- **Depois (R1-45):** a integração de importação encerra abruptamente e reinicia
  a API depois da confirmação humana. O teste verifica sessão existente,
  situação e recibo da importação, leituras ativas, linhas de outbox e correlação
  da auditoria antes e depois.
- **Contratos:** nenhum payload, parser, endpoint ou comportamento produtivo muda.
  As linhas `ENERGY_BILL_IMPORT_QUEUED` e `ENERGY_BILL_IMPORT_APPLIED` continuam
  no formato legado e não são publicadas.
- **Migração compatível:** nenhuma; não há mudança de schema, banco, dependência,
  configuração ou dados.
- **Execução:** o teste reinicia somente a API. Não inicia worker, consumidor,
  polling, extração, OCR ou chamada externa.
- **Rollback:** remover o teste e suas referências documentais; nenhuma mudança
  de runtime, contrato ou banco precisa ser revertida.

## Critérios de aceite

- Uma confirmação manual aplicada mantém estado, revisão e recibo após `SIGKILL`
  e reinicialização da API.
- A sessão autenticada continua válida e o endpoint retorna a mesma importação.
- As duas linhas existentes da `ImportOutbox` mantêm IDs, tipos, payload,
  correlação e estado; o restart não cria duplicatas.
- As duas leituras ativas e a auditoria de confirmação permanecem únicas e
  vinculadas à importação/correlação original.
- Nenhum consumidor ou transporte é ativado.

## Validação

- `pnpm --filter @moura-solar/api build` — passou.
- `node --test --test-concurrency=1 tests/energy-import.integration.mjs` — passou
  com 8/8 cenários, incluindo confirmação manual e restart abrupto.
- `pnpm test:integration` — passou com 125/125 cenários.
- `pnpm check` — passou: formatação, lint, typecheck, testes e build.
- Links locais, Prettier dos documentos e `git diff --check` — passaram.
- CI run `38018885259` — passou: check, geração de API, migrations, integrações
  completas e E2E.

## Limites

O teste comprova durabilidade local após o commit e restart do produtor. Não prova
publicação, consumo, inbox, retry, replay, falha entre efeitos de uma transação
ou operação de OCR. Esses critérios continuam separados e dependem de um
consumidor útil aprovado para fluxo vigente.
