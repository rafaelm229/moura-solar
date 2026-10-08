# R1-07 — Guarda de versão e payload no claim da importação

**Data:** 08/10/2026

**Fase:** R1 — integração gradual

**Estado:** Implementado em branch; `pnpm check`, testes de integração focados e
suíte completa passaram; CI da branch pendente.

**SPECs:** [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-03 (schemaVersion persistida), R1-04 (parser runtime v1),
R1-05 (inventário) e domínio de piloto importação/OCR escolhido
condicionalmente após os gates da PoC.

## Protocolo do incremento

- **ID/fase:** R1-07, R1 — impedir que o futuro consumidor reivindique evento
  legado ou incoerente.
- **Antes:** `claimNextImportOutbox` selecionava todo evento `QUEUED` disponível,
  inclusive `schema_version NULL` ou versões/payloads não reconhecidos. O parser
  v1 compartilhado não era invocado pelo caminho de preparação da tentativa.
- **Depois:** o claim só considera `ENERGY_BILL_IMPORT_QUEUED` v1 com objeto,
  IDs textuais não vazios e `importId`/`documentVersionId` iguais aos registros
  relacionados. `prepareImportAttempt` invoca o parser compartilhado e confere
  os IDs novamente antes de persistir a tentativa.
- **Contratos:** nenhum payload/API/OpenAPI muda. O worker passa a depender do
  pacote interno `@moura-solar/contracts`; não há cópia paralela do parser.
- **Migração compatível:** nenhuma migration ou escrita de dados históricos.
  Eventos `NULL`, versões futuras e payloads inconsistentes não são reivindicados;
  qualquer status/lease já persistido permanece sem alteração. A política de
  retenção, correção, quarentena ou reprocessamento fica explícita para outro
  incremento.
- **Ativação:** `apps/worker/src/main.ts` continua sem consumidor habilitado.
  Nenhum adapter/provedor, broker, polling operacional, OCR ou dado real foi
  ativado por esta guarda.
- **Aceite:** provar no PostgreSQL que somente o evento v1 coerente é
  reivindicado; legados, versões futuras e IDs divergentes ficam inalterados;
  o parser compartilhado rejeita versão legada antes de criar tentativa; os
  caminhos v1 válidos já exercitados continuam compatíveis.
- **Testes:** `node --test tests/energy-import-worker.integration.mjs` passou
  4/4 em PostgreSQL local de teste; `pnpm check` passou; `pnpm test:integration`
  passou 107/107 em PostgreSQL local de teste. CI da branch ainda precisa passar
  antes do estado Validado.
- **Rollback:** reverter o filtro, a chamada do parser, a dependência workspace e
  este documento. Não há migration nem linhas alteradas para desfazer; manter
  intactos contratos e metadados de R1-03.

## Limites

Esta guarda não define política de quarentena/replay, não cria inbox geral e não
implementa loop de consumidor. Eventos excluídos pelo filtro ficam pendentes e
não serão corrigidos nem reprocessados automaticamente. A execução OCR continua
dependente da PoC, corpus autorizado, metas, fornecedor/modelo/região, custo/quota
e privacidade descritos na SPEC-014 e em `docs/lote-5-poc-extracao.md`.
