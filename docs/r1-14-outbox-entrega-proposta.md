# R1-14 — Contrato e outbox local para registro de entrega de proposta

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-14-proposal-delivered`; CI
remota pendente.

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-014](adr/ADR-014-outbox-local-entrega-proposta.md).

**Dependências:** R1-08/09 e R1-10–13 consolidados em
`feat/proposal-visual-clarity`; registro de envio de proposta já transaciona
entrega, estado, atividade e auditoria.

## Antes/depois

- **Antes:** a pessoa registra o envio manual, gravando entrega, versão,
  transição aplicável, atividade de acompanhamento e auditoria; sem evento de
  integração.
- **Depois:** o fato `PROPOSAL_DELIVERED` v1 é persistido na mesma transação.
- **Semântica:** o evento indica somente que a entrega foi registrada pelo
  usuário. Não envia mensagem nem prova recebimento ou leitura.
- **Payload:** IDs da proposta, versão, entrega e oportunidade. Sem destinatário,
  canal, notas, conteúdo documental ou PII.
- **Migração:** nenhuma; usa a outbox existente.
- **Ativação:** evento não publicado, sem dispatcher, consumidor ou integração
  externa. Não ativa WhatsApp.

## Critérios de aceite

- Parser aceita envelope v1 e rejeita IDs vazios/inconsistentes, tipo/versão
  desconhecidos e campos além dos quatro IDs aprovados.
- Integração verifica correlação, ausência de destinatário/canal e
  `publishedAt` nulo.
- Falha forçada da outbox reverte entrega, status, atividade e auditoria.
- `pnpm check`, integração de proposta, CI, links locais e `git diff --check`.
- Rollback remove somente o produtor, preservando estrutura e linhas da outbox.

## Evidência e limites

Os testes do contrato `@moura-solar/contracts` passaram. A integração de proposta
passou 5/5 com PostgreSQL/MinIO locais, incluindo falha forçada da outbox; `pnpm
check` passou (formatação, lint, typecheck, 1.257 testes e build). Links locais e
`git diff --check` passaram. O schema efêmero foi removido pelo teste e os
containers foram parados sem remover volumes. CI remota ainda pendente.

R1 continua em andamento. Importação de contas de energia permanece manual pela
ADR-008; este incremento não inicia OCR nem automação de canais.
