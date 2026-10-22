# ADR-011 — Outbox local para criação de oportunidade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-11; publicação e consumidor permanecem fora
do incremento.

**Escopo:** SPEC-004, SPEC-016 e SPEC-019

## Contexto

O domínio comercial já cria uma oportunidade, a primeira atividade, a transição
para `NOVO` e a auditoria em uma única transação. Com a extração gradual do CRM,
outros domínios precisam referenciar esse fato sem receber o resumo ou a atividade
comercial. R1-09 criou a outbox local e R1-10 registrou a criação de cliente.

## Decisão

- Persistir `OPPORTUNITY_CREATED` v1 na mesma transação que cria a oportunidade,
  atividade inicial, transição e auditoria.
- Usar `Opportunity` como agregado, `opportunity.createdAt` como instante do fato,
  `requestId` como correlação e `OPPORTUNITY_CREATED:<opportunityId>` como chave
  de deduplicação.
- Payload inclui somente `opportunityId`, `customerId` e, quando vinculada,
  `utilityUnitId`. Não copiar título, resumo de necessidade, consumo estimado,
  prioridade, responsável ou assunto/descrição da atividade.
- Manter `publishedAt` nulo. Não ativar consumidor, polling, worker, retry,
  replay, broker ou serviço externo.
- Não alterar resposta HTTP, estados, gates, regras de atribuição, contratos
  existentes ou `ImportOutbox`.

## Consequências e controles

- Nenhuma migration: R1-11 reutiliza `IntegrationOutbox`.
- Falha na gravação do evento reverte oportunidade, atividade, transição e
  auditoria na transação local.
- Consumidores futuros usam apenas IDs para consultar os donos dos dados sob
  autorização e precisam definir inbox/idempotência antes de ativação.
- Rollback reverte o produtor sem excluir a tabela ou eventos já persistidos.

## Evidência necessária para R1-11

Testes do contrato v1; integração confirma correlação, payload mínimo, publicação
inativa e rollback integral; `pnpm check`, integração e `git diff --check`. Não há
teste de entrega pois nenhum consumidor é ativado.
