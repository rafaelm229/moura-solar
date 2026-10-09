# ADR-027 — Outbox local para reagendamento de atividade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-27; publicação e consumidor ficam fora do
incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.rescheduleActivity` exige sessão/autorização, organização,
versão e estado aberto. Atualiza vencimento, pode acrescentar notas à descrição,
incrementa versão e registra auditoria em transação local. Ainda não há evento
durável para o reagendamento.

## Decisão

- Persistir `ACTIVITY_RESCHEDULED` v1 na transação local do comando.
- Preservar validação, autorização, estado, versão, data, notas e resposta atuais.
- Usar Activity como agregado e `requestId` como correlação.
- Payload contém `activityId`, `auditEventId` e vínculos presentes `customerId` /
  `opportunityId`; não incluir vencimento, notas, descrição, assunto, tipo ou
  responsável.
- Deduplicar por `ACTIVITY_RESCHEDULED:<auditEventId>`.
- Não publicar nem ativar dispatcher, consumidor, broker ou chamada externa.

## Consequências e controles

- Nenhuma migration; R1-27 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir evento reverte reagendamento e auditoria.
- Versão obsoleta ou atividade fechada não cria evento.
- Importação de contas permanece manual conforme ADR-008; OCR não é dependência.

## Evidência necessária para R1-27

Contrato e integração verificam autorização, versão, vínculo, correlação,
payload mínimo, `publishedAt` nulo e rollback; `pnpm check`, CI completa, links
locais e `git diff --check`.
