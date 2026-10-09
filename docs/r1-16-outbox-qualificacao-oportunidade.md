# R1-16 — Contrato e outbox local para qualificação de oportunidade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado na branch `feat/proposal-visual-clarity` pelo PR #42
(`6442fc7`); CI completa verde.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-016](adr/ADR-016-outbox-qualificacao-oportunidade.md).

**Dependências:** R1-10, R1-11 e R1-12 consolidados; qualificação atual grava
estado, atividade opcional, `OpportunityTransition` e auditoria em transação
Serializable local.

## Antes/depois

- **Antes:** a qualificação atualiza `NOVO` para `QUALIFICADO`, registra a
  transição e a auditoria, podendo criar uma próxima atividade; não há evento
  durável dessa transição.
- **Depois:** `OPPORTUNITY_QUALIFIED` v1 é gravado na mesma transação com o
  estado, a atividade, a transição e a auditoria.
- **Semântica:** representa exclusivamente a transição autorizada `NOVO` →
  `QUALIFICADO`, após os gates existentes.
- **Payload:** IDs de oportunidade, transição e cliente, mais estados fixos;
  sem nome, resumo de necessidade, consumo, justificativa ou texto de atividade.
- **Correlação/deduplicação:** `requestId` do comando e ID de
  `OpportunityTransition`.
- **Migração:** nenhuma; usa `IntegrationOutbox` existente.
- **Ativação:** evento não publicado; não adiciona consumidor, dispatcher,
  broker ou integração externa.

## Critérios de aceite

- Contrato v1 valida identificadores, agregado, estados fixos e ausência de
  campos comerciais extras.
- Integração confirma correlação, vínculo à transição e `publishedAt` nulo.
- Falha forçada de outbox reverte estado, versão, transição, atividade e
  auditoria.
- Comando repetido com versão antiga continua rejeitado pelos gates atuais e não
  cria outra transição/evento.
- `pnpm check`, contrato, integração comercial, CI completa, links locais e
  `git diff --check`.
- Rollback remove somente o produtor/contrato novo; preserva linhas históricas e
  a estrutura da outbox.

## Evidência e limites

Os testes de `@moura-solar/contracts` passaram (33/33); build da API passou;
`tests/commercial.integration.mjs` passou 11/11 com PostgreSQL/MinIO locais,
incluindo rollback da transação; `pnpm check` passou em formatação, lint,
typecheck, 1.257 testes e build. Prettier, links locais e `git diff --check`
passaram. CI completa do PR #42 passou, incluindo geração de API, migrations,
integração e E2E. Squash-merge em `6442fc7`; sem deploy. Nenhuma migration. R1
continua em andamento. Nenhum gate CRM muda; importação de contas permanece
manual conforme ADR-008.
