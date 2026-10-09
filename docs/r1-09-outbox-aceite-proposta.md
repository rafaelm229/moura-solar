# R1-09 — Persistência transacional do aceite na outbox

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente em `codex/poc-01-decisions`; publicação e
consumidor continuam inativos.

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisões:** [ADR-009](adr/ADR-009-outbox-local-aceite-proposta.md) e contrato
[R1-08](r1-08-contrato-aceite-proposta.md).

**Dependências:** R1-08 validado (`df2b571`); `ProposalService.recordAcceptance`
como fonte do fato e `requestId` como correlação.

## Antes/depois

- **Antes:** aceite, transições, atividade e auditoria eram atômicos na transação
  PostgreSQL. Não havia evento durável genérico ligado ao fato.
- **Depois:** a mesma transação também cria `PROPOSAL_ACCEPTED` v1 em
  `IntegrationOutbox`, com dedupe por organização/ID do aceite e payload mínimo.
  A resposta e o comportamento de domínio permanecem os mesmos.
- **Contrato:** envelope definido em R1-08; sem alteração HTTP/OpenAPI ou de
  automações. O evento não equivale a assinatura, venda concluída ou gate.
- **Migração:** tabela aditiva e sem FK ao agregado para evitar cascata de
  exclusão; FK restritiva somente à organização. Nenhuma linha existente é
  convertida ou removida.
- **Consumidor/infraestrutura:** sem transporte, polling, worker, retries,
  publicação ou integração externa. `publishedAt` permanece nulo.
- **Retenção:** sem expiração ou exclusão automática; política deve ser aprovada
  antes de ampliar produtores ou operar despacho prolongado.

## Critérios de aceite

- Migração aplica em schema vazio e sobre schema da versão anterior preservando
  organização preexistente.
- Integração confirma evento e correlação junto com aceite; repetição rejeitada
  pela regra existente não duplica a linha.
- Falha da gravação do evento aborta a mesma transação do aceite.
- `pnpm check`, `pnpm test:migrations`, integração da proposta e `git diff --check`.
- Rollback: reverter código produtor sem apagar tabela/linhas; sem down
  destrutivo nem reprocessamento automático.

## Limites

O estado de R1-09 não aprova a entrega do evento. Inbox, concorrência/lease,
tentativas, replay, reconciliação, retenção final e transporte permanecem em
especificação até existir consumidor necessário e sua política própria.

## Evidência

- `pnpm test:migrations`: passou; migrations aplicaram em schema vazio e após
  migrations anteriores com organização preexistente.
- Integração `tests/proposal.integration.mjs`: 5/5 passaram, incluindo rollback
  ao falhar a inserção outbox, correlação e ausência de duplicata após conflito
  de aceite. Usou MinIO efêmero na porta 19000.
- `pnpm check`: passou; formatação, lint, tipos, testes e builds. API 1.257/1.257,
  web 5/5, contratos 12 e harness da PoC 24/24 testes.
- `git diff --check`: passou. Schemas temporários foram removidos pelos testes;
  o PostgreSQL Compose foi parado sem remover volumes.
