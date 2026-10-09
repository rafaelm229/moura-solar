# R1-18 — Contrato e outbox local para reabertura de oportunidade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-18-opportunity-reopened`;
CI e consolidação ainda pendentes.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-018](adr/ADR-018-outbox-reabertura-oportunidade.md).

**Dependências:** R1-17 consolidado; `CommercialService.reopenOpportunity`
valida permissão `opportunities:reopen`, versão esperada e justificativa, e
persiste mudança de estado, `OpportunityTransition` e auditoria em transação
local.

## Antes/depois

- **Antes:** o comando autorizado reabre oportunidade `PERDIDO` ou `CANCELADO`,
  limpa os campos correntes de perda, registra transição/auditoria e preserva
  eventos históricos; não cria fato durável na outbox de integração.
- **Depois:** `OPPORTUNITY_REOPENED` v1 é inserido na mesma transação local.
- **Semântica:** registra apenas a transição existente para `NOVO`; não muda
  autorização administrativa, justificativa, estados permitidos, gates ou
  histórico.
- **Payload:** oportunidade, transição, estado de origem e destino; sem
  justificativa ou texto comercial.
- **Correlação/deduplicação:** `requestId` do comando e ID imutável da
  `OpportunityTransition`.
- **Migração:** nenhuma; usa `IntegrationOutbox` existente.
- **Ativação:** evento permanece não publicado; sem dispatcher, consumidor,
  broker ou integração externa.

## Critérios de aceite

- Contrato v1 aceita somente origens `PERDIDO`/`CANCELADO`, destino `NOVO`, IDs
  válidos e payload mínimo; rejeita tipo/versão/campos extras inválidos.
- Teste de integração preserva a autorização existente: vendedor sem permissão
  recebe 403 e administrador autorizado conclui a reabertura.
- Integração confirma correlação, vínculo à transição, payload e `publishedAt`
  nulo.
- Falha forçada da outbox reverte estado/versão, campos de perda, transição e
  auditoria.
- `pnpm check`, build/testes de contratos, integração comercial com PostgreSQL e
  MinIO locais, CI completa, links locais, Prettier e `git diff --check`.
- Rollback remove somente o produtor/contrato novos; preserva histórico e
  estrutura da outbox.

## Evidência e limites

Os testes de `@moura-solar/contracts` passaram (39/39); build da API passou;
`tests/commercial.integration.mjs` passou 11/11 com PostgreSQL e MinIO locais,
incluindo autorização e rollback da reabertura. `pnpm check` passou em formatação,
lint, typecheck, 1.257 testes da API, 5 da web, 24 testes offline do harness
histórico da PoC e build. Prettier, links locais e `git diff --check` passaram.
Nenhuma migration. CI e consolidação ainda não ocorreram; R1 permanece em
andamento. A importação de contas continua manual conforme ADR-008, fora do
escopo deste incremento.
