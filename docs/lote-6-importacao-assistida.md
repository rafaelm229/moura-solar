# Lote 6 — Importação assistida de contas de energia

## Incremento 6A-1 — intake durável

Data: 05/10/2026. Escopo e contratos da SPEC-014 aprovados para implementação.
Branch: `feat/lote-6-energy-import-foundation`.

O incremento recebe somente uma versão documental `READY`, cria uma
`EnergyBillImport` em `QUEUED` e registra `ENERGY_BILL_IMPORT_QUEUED` na outbox
na mesma transação. O payload da outbox contém apenas os IDs da importação e da
versão; nenhum dado extraído ou conteúdo pessoal é copiado para o evento.

`POST /customers/:customerId/energy-imports` exige `Idempotency-Key`,
`energy_imports:create`, leitura contextual do cliente e do documento e valida
que a versão READY pertence ao cliente. Também valida a propriedade de UC e
oportunidade opcionais. Repetir a chave e o payload devolve o resultado original;
reutilizar a chave com outro payload retorna conflito. `GET /energy-imports/:id`
exige `energy_imports:read` e revalida o contexto do cliente e documento.

Nenhum fornecedor é chamado. As decisões sobre mapeamento de classe tarifária,
fornecedor e limites de custo continuam pendentes e não são inferidas.

## Incremento 6A-2 — revisão manual e confirmação transacional

Data: 05/10/2026. Implementado em `feat/lote-6-import-review-confirm`.

`PUT /energy-imports/:id/review` aceita revisão manual para uma importação
`QUEUED` ou `REVIEW_REQUIRED` vinculada a uma UC existente. O comando registra
decisões explícitas `KEEP`, `INSERT` e `REPLACE` para meses, candidatos com
origem manual, versão esperada da leitura e motivo de substituição. A revisão
guarda snapshot e digest para detectar alterações concorrentes.

`POST /energy-imports/:id/confirm` aplica a revisão em uma única transação,
revalida organização, grants, vínculo documental e versões de leitura, grava
proveniência e revisões imutáveis, substitui leituras anteriores conforme as
decisões, vincula o documento à UC e emite recibo idempotente. Conflitos não
aplicam alterações parciais. A leitura e correção manual existentes também
passam a registrar revisões de proveniência.

Este incremento não inclui consumidor da outbox, OCR nem interface web de revisão. Importações sem
revisão continuam em `QUEUED`; o fluxo assistido ainda não está liberado para
operação geral. A confirmação está disponível pela API para a revisão manual
de uma UC existente.

## Incremento 6A-3 — cancelamento e repetição explícitos

Data: 05/10/2026. Implementado em `feat/lote-6-attempt-lifecycle`.

O cancelamento aceita `QUEUED`, `REVIEW_REQUIRED` ou `FAILED`, valida a versão
esperada, marca a importação como terminal `CANCELED`, encerra eventos ainda
pendentes na outbox e registra ator, motivo e transição em uma tabela imutável.
Estados em processamento, confirmação ou aplicação não são cancelados por este
comando.

O retry aceita somente `FAILED`, exige motivo e versão atual, preserva o mesmo
documento READY e cria novo evento de outbox com chave de deduplicação própria.
Ambos os comandos são idempotentes e revalidam organização, cliente e documento.
Não há política de retry automático nem chamada a fornecedor; tentativas,
leases, orçamento e cancelamento de operação externa permanecem na próxima
fatia do worker, com parâmetros operacionais ainda pendentes.

### Validação

- `pnpm api:generate`: OpenAPI e cliente TypeScript atualizados.
- `pnpm test:migrations`: migration aplicada em banco vazio e upgrade preservando
  leitura e dossiê preexistentes; reaplicação segura.
- `node --test tests/energy-import.integration.mjs`: valida intake, revisão,
  conflito sem aplicação parcial, replay, recibo e grants positivos/negativos.
- `node --test tests/design.integration.mjs`: valida proveniência das leituras
  manuais e correções existentes.
- `pnpm api:generate`: OpenAPI e cliente TypeScript atualizados.
- `pnpm test:migrations`: migration aditiva aprovada em banco vazio e upgrade.
- `pnpm test:integration`: 101/101.
- `pnpm test:e2e`: 31/31 jornadas responsivas existentes.
- `pnpm check`: formato, lint, tipos, 1.250 testes unitários e build aprovados.
- `git diff --check`: aprovado.

As decisões operacionais de mapeamento de classe tarifária, fornecedor/região
OCR e limites de custo/quota continuam pendentes e não são inferidas nesta fatia.
