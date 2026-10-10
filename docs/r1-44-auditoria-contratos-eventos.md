# R1-44 — Auditoria de cobertura dos contratos de eventos atuais

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-44-event-contract-audit`; CI pendente.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-04 (parser v1), R1-42 (último contrato de estado de
contrato) e R1-43 (durabilidade após reinício).

## Diferenças antes/depois

- **Antes:** SPEC-019 mantinha pendente a publicação dos contratos dos fatos
  existentes além de `PROPOSAL_ACCEPTED`, embora os incrementos R1-10 a R1-42
  já tivessem acrescentado contratos por domínio.
- **Depois (R1-44):** comparação do checkout confirma que cada nome de evento
  literal encontrado nos produtores da API tem definição de payload v1 e
  cobertura de parser exportada por `packages/contracts`.
- **Contratos, API e banco:** nenhum arquivo de runtime, assinatura, payload,
  migration ou dado foi alterado. Os contratos já publicados permanecem fonte
  canônica; este relatório só registra o resultado da auditoria.
- **Limites:** cobertura dos produtores literais atuais. Não valida semântica
  para consumidores, candidatos de eventos futuros, publicação, inbox ou replay.

## Evidência da comparação

Uma varredura dos literais `eventType` em `apps/api/src/**/*.ts` e
`packages/contracts/src/*.ts` encontrou **32 tipos em cada lado**, com igualdade
exata dos conjuntos: nenhum produtor sem tipo/parser de payload e nenhum tipo
sem produtor atual. O pacote declara e exporta 31 parsers: um parser cobre os
dois tipos `ENERGY_BILL_IMPORT_*` como união; os demais 30 tipos têm parser
próprio. Desses 30, 30 usam o envelope compartilhado. Os dois eventos de
importação mantêm o formato legado de payload v1: a correlação vive na coluna
`ImportOutbox.correlationId`, não no objeto validado pelo parser. Eles ainda não
foram adaptados ao envelope compartilhado R1-01, conforme limite já registrado
na SPEC-019. O inventário comprova cobertura de nomes/payloads, não adaptação
completa de todos os contratos.

O conjunto coberto é:

- Cliente: `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_ARCHIVED`,
  `CUSTOMER_RESTORED`.
- UC: `UTILITY_UNIT_CREATED`, `UTILITY_UNIT_UPDATED`.
- Oportunidade: `OPPORTUNITY_CREATED`, `OPPORTUNITY_UPDATED`,
  `OPPORTUNITY_QUALIFIED`, `OPPORTUNITY_LOST`, `OPPORTUNITY_REOPENED`.
- Atividade: `ACTIVITY_CREATED`, `ACTIVITY_CANCELED`, `ACTIVITY_COMPLETED`,
  `ACTIVITY_RESCHEDULED`.
- Proposta: `PROPOSAL_CREATED`, `PROPOSAL_DELIVERED`,
  `PROPOSAL_VERSION_CREATED`, `PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`.
- Catálogo: `CATALOG_ITEM_CREATED`, `CATALOG_ITEM_UPDATED`.
- Contrato: `CONTRACT_CREATED`, `CONTRACT_REVIEW_REQUESTED`,
  `CONTRACT_APPROVED`, `CONTRACT_DELIVERED`, `CONTRACT_CANCELED`,
  `CONTRACT_AMENDMENT_RECORDED`, `CONTRACT_SIGNED_REVIEWED`,
  `CONTRACT_SIGNED_UPLOADED`.
- Importação manual: `ENERGY_BILL_IMPORT_QUEUED`,
  `ENERGY_BILL_IMPORT_APPLIED`. A existência de seus contratos não ativa OCR ou
  consumidor.

## Critérios de aceite

- Conjuntos de nomes dos produtores atuais e dos contratos têm igualdade exata.
- Cada nome atual possui definição de payload v1 e cobertura de parser exportada
  (individual ou pelo parser de união da importação manual).
- A exceção de envelope dos dois eventos `ENERGY_BILL_IMPORT_*` fica explícita;
  não se altera seu contrato legado sem caso de consumo justificado.
- SPEC-019 distingue cobertura dos fatos existentes de eventos candidatos futuros.
- Nenhum consumidor ou transporte é criado para completar a matriz.

## Validação e rollback

- A comparação acima passou no checkout `3428b85`.
- `pnpm --filter @moura-solar/contracts test` — build passou; 9 arquivos de
  teste de contrato passaram.
- `pnpm check` — passou.
- CI do incremento ainda pendente; aguardará PR.
- `git diff --check`, formatação e links locais — passaram.
- Rollback reverte este relatório e suas referências; não há mudança de runtime,
  contrato publicado, banco ou dados.

## Pendências

Eventos de domínios futuros continuam propostos até haver fluxo e consumidor
justificados. Entrega, idempotência de inbox, retry, replay, saga e reconciliação
permanecem critérios independentes da cobertura estática dos contratos atuais.
