# R1-41 — Outbox da criação do contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #89, merge `40d7ea242ce6e7ee9486d816009ec0d747c945f5`;
CI run `38012077654` verde.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-041](adr/ADR-041-evento-contrato-criado.md).

**Dependências:** R1-09 (aceite de proposta), R1-24 (`ACTIVITY_CREATED`) e
R1-40 (fatos de upload/atividade de contrato); criação manual de contrato
existente.

## Diferenças antes/depois

- **Antes:** a transação criava contrato, versão, gate, documentos, plano
  financeiro elegível, atividade de assinatura e auditoria sem evento de criação.
- **Depois (R1-41):** a transação inclui `CONTRACT_CREATED` v1 e
  `ACTIVITY_CREATED` v1, com IDs apenas e correlação pelo request ID.
- **Payload de contrato:** `contractId`, `contractVersionId`,
  `acceptedProposalVersionId`, `auditEventId` e `opportunityId`.
- **Limites:** sem snapshot, preço, PII, dados ou metadados de arquivos; sem novo
  consumidor/dispatcher, gate, alteração financeira, migration ou OpenAPI.
- **Armazenamento:** uploads dos PDFs/DOCX permanecem na execução da transação
  local e podem deixar objetos órfãos em caso de rollback do banco. Não há
  compensação distribuída neste incremento.

## Critérios de aceite

- Criação nova grava documento, estado, auditoria e dois eventos correlacionados.
- A atividade usa o contrato `ACTIVITY_CREATED`; o contrato usa agregado próprio.
- Repetição idempotente retorna o mesmo contrato sem eventos adicionais.
- O gate contratual continua `PENDING`; os dois PDFs/DOCX mantêm o comportamento.
- Parser rejeita tipo/versão incompatível, agregado divergente e campos extras.

## Riscos e rollback

O limite entre armazenamento e transação é preexistente e permanece registrado.
Rollback remove somente o novo parser, tipo e emissões dos dois eventos.

## Evidências

- `pnpm --filter @moura-solar/contracts test`: passou (9 suítes).
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: passou
  (9 cenários; evento de contrato/atividade, correlação, PDFs, gate e replay).
- `pnpm check`: passou (format, lint, typecheck, testes e build).
- CI run `38012077654`: `check` verde, incluindo `pnpm check`, migrations,
  integrações e E2E.
- Consolidação: PR #89 mesclado no commit `40d7ea242ce6e7ee9486d816009ec0d747c945f5`.
