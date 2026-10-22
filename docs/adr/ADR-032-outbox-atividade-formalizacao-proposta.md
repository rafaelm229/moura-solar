# ADR-032 — Outbox para atividade de formalização após aceite

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-32; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-006, SPEC-016 e SPEC-019

## Contexto

`recordAcceptance` registra `PROPOSAL_ACCEPTED` e cria na mesma transação uma
atividade para formalização do contrato. O evento de aceite existe, mas o fato
de criação dessa atividade ainda não é registrado separadamente.

## Decisão

- Persistir `ACTIVITY_CREATED` v1 para a atividade de formalização na mesma
  transação local do aceite.
- Reutilizar a auditoria `PROPOSAL_ACCEPTED`; não criar auditoria separada.
- Usar a atividade como agregado e o payload mínimo `activityId`,
  `auditEventId`, `customerId` e `opportunityId`.
- Correlacionar pelo `requestId` e deduplicar por
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Preservar aceite, transição da oportunidade, atividade, evento
  `PROPOSAL_ACCEPTED`, autorização e resposta atuais.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; reutilizar `IntegrationOutbox` e `AuditEvent` existentes.
- Se a gravação do evento filho falhar, reverter aceite, versão, oportunidade,
  transição, atividade, auditoria e evento pai.
- A importação de contas permanece manual conforme ADR-008; OCR não é
  dependência deste incremento.

## Evidência necessária para R1-32

Integração comprova auditoria compartilhada, payload mínimo, correlação,
deduplicação e rollback integral; `pnpm check`, CI, links, Prettier e
`git diff --check`.
