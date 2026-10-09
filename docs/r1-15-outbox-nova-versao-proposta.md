# R1-15 — Contrato e outbox local para nova versão de proposta

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado na branch `feat/proposal-visual-clarity` pelo PR #41
(`5540b26`); CI completa verde.

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-015](adr/ADR-015-outbox-nova-versao-proposta.md).

**Dependências:** R1-08/09 e R1-10–14 consolidados em
`feat/proposal-visual-clarity`; `ProposalService.createNextVersion` já grava a
nova versão e a auditoria em transação local, antes de gerar seu PDF.

## Antes/depois

- **Antes:** a criação da nova versão e a auditoria persistem em transação local;
  não há evento de integração para essa nova versão.
- **Depois:** `PROPOSAL_VERSION_CREATED` v1 é gravado na mesma transação com a
  versão e a auditoria.
- **Semântica:** o evento registra criação da versão. Geração/prontidão de PDF
  acontece depois e não é afirmada.
- **Payload:** IDs da proposta, nova versão, versão de origem e oportunidade;
  sem snapshots, preço, texto comercial ou PII.
- **Correlação/deduplicação:** `requestId` da chamada e chave única lógica por
  ID da nova versão.
- **Migração:** nenhuma; usa `IntegrationOutbox` existente.
- **Ativação:** linha permanece não publicada; sem dispatcher, consumidor,
  broker ou chamada externa.

## Critérios de aceite

- Contrato versionado valida IDs obrigatórios, agregado correspondente, versões
  distintas e rejeita campos extras.
- Integração verifica correlação, linhagem mínima e `publishedAt` nulo.
- Falha forçada de outbox reverte nova versão e auditoria.
- `pnpm check`, testes de contrato, integração de proposta, CI completa, links
  locais e `git diff --check`.
- Rollback remove o produtor/contrato desse incremento sem excluir estrutura ou
  linhas existentes da outbox.

## Evidência e limites

`pnpm --filter @moura-solar/contracts test` passou (29/29); build da API passou;
`tests/proposal.integration.mjs` passou 6/6 com PostgreSQL/MinIO locais,
incluindo rollback forçado da outbox; `pnpm check` passou em formatação, lint,
typecheck, 1.257 testes e build. Migrations não mudaram. CI completa do PR #41
passou, incluindo geração de API, migrations, integração e E2E. Squash-merge
em `5540b26`; sem deploy.
R1 continua em andamento. Esta entrega não ativa publicação nem consumidor; a
importação de contas permanece manual conforme ADR-008.
