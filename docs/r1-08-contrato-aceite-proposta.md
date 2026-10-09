# R1-08 — Contrato versionado para aceite de proposta

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente em `codex/poc-01-decisions`, commit `df2b571`.

**SPECs:** [SPEC-006](../specs/SPEC-006-propostas/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-01 (envelope compartilhado), contrato existente de
`PROPOSAL_ACCEPTED` na SPEC-006 e fato atual persistido por
`ProposalService.recordAcceptance`.

## Protocolo do incremento

- **Antes:** SPEC-019 listava `proposal.accepted` como evento candidato. O pacote
  compartilhado validava o envelope e payloads da importação; não havia contrato
  versionado para o aceite de proposta.
- **Depois:** `packages/contracts` exporta `ProposalAcceptedEventV1` e
  `parseProposalAcceptedEventV1`. O payload inclui somente os IDs de aceite,
  versão da proposta e oportunidade; organização, agregado, correlação e instante
  pertencem ao envelope comum.
- **Semântica:** `PROPOSAL_ACCEPTED` representa o aceite formal registrado pela
  operação já existente. Não significa assinatura de contrato, venda concluída,
  quitação ou liberação de qualquer gate posterior.
- **Contratos:** extensão aditiva do pacote interno. Nenhum endpoint/OpenAPI,
  consumidor, produtor, resposta da API ou comportamento de aceite muda.
- **Migração:** nenhuma. Não cria outbox genérico, tabela, coluna ou dados. O
  `ImportOutbox` permanece restrito ao seu domínio atual.
- **Ativação:** nenhuma publicação, polling, worker, broker, automação ou chamada
  externa. A SPEC-019 continua exigindo transação local, retenção, idempotência,
  inbox e transporte definidos antes de um produtor/consumidor operacional.
- **Aceite:** parser aceita envelope v1 com os três identificadores e preserva o
  objeto; rejeita tipo/versão divergentes, envelope inválido e payload ausente ou
  vazio; não altera os testes ou regras da SPEC-006.
- **Rollback:** reverter somente o tipo, parser, testes e este registro. Não há
  estado de banco ou efeito de runtime a desfazer.

## Evidência e limites

`ProposalService.recordAcceptance` já persiste a aceitação, atualiza a versão e a
oportunidade e grava auditoria na mesma transação. R1-08 não modifica esse fluxo.
Antes de publicar o fato, um incremento separado deve decidir a chave de evento,
correlação proveniente da requisição, persistência atômica, política de retenção,
consumidor e tratamento de retry/replay. O consumidor do worker permanece
desabilitado e nenhum transporte é escolhido.

## Verificações

- Contrato e testes unitários do pacote `@moura-solar/contracts`.
- `pnpm check` antes do commit.
- `git diff --check` e formatação dos arquivos afetados.
