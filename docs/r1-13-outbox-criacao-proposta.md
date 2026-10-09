# R1-13 — Contrato e outbox local para criação de proposta

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado em `feat/proposal-visual-clarity` pelo PR #39
(`85db90f`).

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-013](adr/ADR-013-outbox-local-criacao-proposta.md).

**Dependências:** R1-08/09 e R1-10–12 consolidados em
`feat/proposal-visual-clarity`; proposta, primeira versão e auditoria já são
persistidas por `ProposalService.createProposal`.

## Antes/depois

- **Antes:** proposta, primeira versão e auditoria persistem em transação local;
  não há evento de integração para a criação.
- **Depois:** contrato `PROPOSAL_CREATED` v1 e linha na `IntegrationOutbox` são
  gravados nessa mesma transação.
- **Semântica:** o fato representa criação do registro e versão inicial. A
  geração de PDF ocorre depois da transação e não é afirmada pelo evento.
- **Payload:** apenas `proposalId`, `proposalVersionId` e `opportunityId`; sem
  snapshot, preço, texto comercial ou PII.
- **Migração:** nenhuma; usa a outbox existente.
- **Ativação:** evento não publicado, sem dispatcher, consumidor, broker ou
  chamadas externas.

## Critérios de aceite

- Parser aceita o envelope v1 e rejeita campos extras, IDs vazios/inconsistentes,
  tipo ou versão não suportados.
- Integração verifica correlação, payload mínimo e `publishedAt` nulo.
- Falha forçada de outbox reverte proposta, versão inicial e auditoria.
- `pnpm check`, integração de proposta, CI, links locais e `git diff --check`.
- Rollback remove produtor sem apagar estrutura ou linhas já gravadas.

## Evidência e limites

O contrato de propostas passou nos testes do pacote (`@moura-solar/contracts`),
a integração de proposta passou 5/5 com PostgreSQL/MinIO locais e `pnpm check`
passou (formatação, lint, typecheck, 1.257 testes e build). Links Markdown locais
e `git diff --check` passaram. A integração descartou somente o schema efêmero;
os containers foram parados sem remover volumes. CI completa do PR #39 passou,
incluindo geração de API, migrations, integração e E2E. Squash-merge em
`85db90f`; sem deploy.
R1 continua em andamento; este incremento não ativa publicação nem consumidor.
A criação manual de contas de energia permanece vigente pela ADR-008.
