# R1-25 — Contrato e outbox local para cancelamento de atividade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #57, merge commit `b147ea8`; CI #113 completa
verde.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-025](adr/ADR-025-outbox-cancelamento-atividade.md).

**Dependências:** R1-24 consolidado; cancelamento, autorização, controle de
versão e auditoria já existem na transação local.

## Antes/depois

- **Antes:** cancelar validava versão e status e persistia atualização/auditoria
  atomicamente, sem evento de integração.
- **Depois:** `ACTIVITY_CANCELED` v1 será gravado junto do cancelamento e auditoria.
- **Semântica:** registra o cancelamento aceito sem alterar autorização, gates,
  status, versão ou resposta.
- **Payload:** `activityId`, `auditEventId` e vínculos presentes `customerId` /
  `opportunityId`; sem justificativa ou dados da atividade.
- **Correlação/deduplicação:** `requestId` e ID imutável da auditoria.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** não publicado; sem dispatcher, consumidor, broker ou integração
  externa.

## Critérios de aceite

- Contrato v1 exige IDs do agregado e da auditoria, aceita vínculos opcionais
  não vazios e rejeita payload adicional.
- Integração comprova 401 sem sessão, 409 por versão obsoleta, correlação,
  auditoria, payload mínimo e `publishedAt` nulo.
- Falha forçada da outbox reverte status, versão e auditoria.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI completa, links locais,
  Prettier e `git diff --check`.
- Rollback remove somente produtor e contrato novos, preservando atividade,
  auditoria e histórico.

## Limites

R1-25 não publica evento e não ativa consumidor. OCR permanece fora do escopo;
importação e revisão de contas continuam manuais conforme ADR-008.

## Evidência local

`@moura-solar/contracts` passou 53/53 testes; a API compilou e passou
1.257/1.257 testes unitários; a integração comercial com PostgreSQL e MinIO
locais passou 17/17, incluindo 401, rollback forçado, correlação, payload
mínimo e 409 por versão obsoleta. `pnpm check` passou por formatação, lint,
typecheck, testes e builds. CI #113 passou integralmente por `pnpm check`,
geração da API e cliente sem diff, scanner de documentos, migrations, integração
e E2E. O PR #57 foi consolidado em `b147ea8`.
