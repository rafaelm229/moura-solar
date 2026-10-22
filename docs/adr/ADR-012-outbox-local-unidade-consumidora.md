# ADR-012 — Outbox local para criação de unidade consumidora

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-12; publicação e consumidor permanecem fora
do incremento.

**Escopo:** SPEC-004, SPEC-016 e SPEC-019

## Contexto

O CRM cria uma UC associada ao cliente e registra auditoria na mesma transação.
Há também o fluxo de criar e vincular a UC a uma oportunidade, que reutiliza a
mesma operação transacional. A extração gradual exige um fato referenciável sem
copiar dados de conta, endereço ou distribuidora. R1-09 criou a outbox e R1-10/11
registraram fatos de cliente e oportunidade.

## Decisão

- Persistir `UTILITY_UNIT_CREATED` v1 na transação local compartilhada pelos
  fluxos de criação da UC, incluindo criação/vínculo com oportunidade.
- Usar `UtilityUnit` como agregado, `unit.createdAt` como instante, `requestId`
  como correlação e `UTILITY_UNIT_CREATED:<utilityUnitId>` para deduplicação.
- Payload inclui somente `utilityUnitId`, `customerId` e, quando presente,
  `addressId`. Não copiar código externo da conta, distribuidora, classe tarifária,
  endereço, titular ou outros dados pessoais/operacionais.
- Manter `publishedAt` nulo. Sem consumidor, polling, worker, retry, replay,
  broker ou serviço externo.
- Preservar respostas, autorização, prevenção de duplicidade e comportamento de
  criação/vínculo existentes. Não alterar `ImportOutbox`.

## Consequências e controles

- Nenhuma migration: R1-12 reutiliza `IntegrationOutbox`.
- Falha na inserção do evento reverte UC, auditoria e vínculo transacional.
- Consumidores futuros consultam o proprietário dos dados sob autorização e
  precisam definir inbox/idempotência antes de ativação.
- Rollback remove o produtor sem apagar tabela ou eventos já persistidos.

## Evidência necessária para R1-12

Testes do contrato v1; integração verifica correlação, payload sem códigos da UC
e rollback atômico; `pnpm check`, integração e `git diff --check`. Não há entrega
ou consumidor a testar nesta etapa.
