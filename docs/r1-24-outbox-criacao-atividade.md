# R1-24 — Contrato e outbox local para criação de atividade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #55, merge commit `ca681e3`; CI #111 completa
verde.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-024](adr/ADR-024-outbox-criacao-atividade.md).

**Dependências:** R1-23 consolidado; criação de atividade e auditoria já
ocorrem na mesma transação, e a rota exige `activities:manage`.

## Antes/depois

- **Antes:** atividade e auditoria eram persistidas atomicamente, sem evento de
  integração.
- **Depois:** `ACTIVITY_CREATED` v1 será gravado junto da atividade e auditoria.
- **Semântica:** fato de criação; não modifica permissões, regra de negócio,
  resposta, responsáveis ou vencimentos.
- **Payload:** `activityId`, `auditEventId` e vínculos presentes `customerId` /
  `opportunityId`; sem assunto, descrição, tipo, responsável, vencimento ou
  resultado.
- **Correlação/deduplicação:** `requestId` e ID imutável da auditoria.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** evento não publicado, sem dispatcher, consumidor, broker ou
  integração externa.

## Critérios de aceite

- Contrato v1 exige IDs da atividade e auditoria, valida o agregado, aceita
  vínculos opcionais não vazios e rejeita campos extras.
- Teste da API comprova 401 sem sessão, correlação, vínculo à auditoria, payload
  mínimo e `publishedAt` nulo.
- Falha forçada de inserção da outbox reverte atividade e auditoria.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI completa, links locais,
  Prettier e `git diff --check`.
- Rollback remove apenas produtor e contrato novos; preserva atividades,
  auditoria e histórico existentes.

## Limites

R1-24 não ativa consumidor ou publicação e não altera fluxo manual de importação
de contas. OCR, worker e serviços de terceiros permanecem fora deste incremento.

## Evidência local

`@moura-solar/contracts` passou 7/7 arquivos e 51/51 testes; a API compilou e
passou 1.257/1.257 testes unitários; a integração comercial com PostgreSQL e
MinIO locais passou 16/16, incluindo 401 sem sessão, rollback forçado,
correlação, vínculo à auditoria e payload sem assunto/descrição. `pnpm check`
passou por formatação, lint, typecheck, testes (API 1.257, contratos 51, web 5,
harness histórico da PoC 24) e builds. A CI #111 passou integralmente por
`pnpm check`, geração da API e cliente sem diff, scanner de documentos,
migrations, integração e E2E. O PR #55 foi consolidado em `ca681e3`. Nenhum
consumidor ou publicação foi ativado.
