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
pendentes e revoga leases ativas da outbox; registra ator, motivo e transição em
uma tabela imutável.
Estados em processamento, confirmação ou aplicação não são cancelados por este
comando.

O retry aceita somente `FAILED`, exige motivo e versão atual, preserva o mesmo
documento READY e cria novo evento de outbox com chave de deduplicação própria.
Ambos os comandos são idempotentes e revalidam organização, cliente e documento.
Não há política de retry automático nem chamada a fornecedor; tentativas,
leases, orçamento e cancelamento de operação externa permanecem na próxima
fatia do worker, com parâmetros operacionais ainda pendentes.

## Incremento 6A-4 — base durável de tentativas e leases

Data: 05/10/2026. Implementado em `feat/lote-6-durable-attempts`.

A migration adiciona `ExtractionAttempt` para correlação, identidade opcional de
adapter/modelo, operação externa, lease, heartbeat, páginas, custo e erro seguro.
A outbox passa a registrar proprietário e heartbeat da lease, conclusão e
código seguro de falha.

O pacote worker fornece operações PostgreSQL atômicas para claim com
`FOR UPDATE SKIP LOCKED`, renovação de lease, conclusão e devolução agendada de
eventos. Testes cobrem concorrência, recuperação após lease expirada, rejeição
de ack obsoleto e adiamento. O entrypoint continua sem consumidores ativos e
nenhuma chamada externa é feita nesta fatia.

## Incremento 6A-5 — correlação e recuperação de tentativa

Data: 05/10/2026. Implementado em `feat/lote-6-attempt-recovery`.

Cada tentativa passa a se vincular a um evento de outbox. Antes da submissão,
o worker prepara a tentativa e persiste a chave de correlação; depois marca
`SUBMITTING` antes de qualquer chamada externa e registra o `operationId` assim
que recebido. Na retomada, `CLAIMED` pode continuar com a mesma correlação,
`SUBMITTED` recupera a operação existente e `SUBMITTING` sem `operationId` vira
`UNKNOWN`/`FAILED`, sem reenvio automático. `GET /energy-imports/:id` expõe
metadados seguros da tentativa, sem bytes do documento ou conteúdo bruto.

Estas transições são exercitadas por fixtures locais; o worker de produção
segue desativado e nenhum adapter é invocado.

### Validação

- `pnpm api:generate`: contrato e cliente TypeScript atualizados com metadados
  seguros de tentativas.
- `pnpm test:migrations`: migration aplicada em banco vazio e upgrade preservando
  dados existentes; reaplicação segura.
- `pnpm test:integration`: 104/104, incluindo retomada de `operationId` e
  submissão ambígua sem repetição.
- `pnpm test:e2e`: 31/31 jornadas responsivas existentes.
- `pnpm check`: formato, lint, tipos, 1.250 testes unitários e build aprovados.
- `git diff --check`: aprovado.

OpenAPI permaneceu coerente e foi regenerado para expor apenas metadados seguros
das tentativas.

As decisões operacionais de mapeamento de classe tarifária, fornecedor/região
OCR e limites de custo/quota continuam pendentes e não são inferidas nesta fatia.

## Incremento 6A-6 — persistência e bloqueio de resultados tardios

Implementado em `feat/lote-6-result-fencing`.

O resultado normalizado só pode ser persistido quando tentativa `SUBMITTED`, lease
vigente e importação `QUEUED` ainda correspondem ao mesmo evento. A transação
grava candidatos como evidência OCR, fecha a tentativa e a outbox e move a
importação para `REVIEW_REQUIRED`; cancelamento ou resposta atrasada perde a
condição de gravação e gera auditoria sem guardar os candidatos. Confiança do
fornecedor, qualidade e validação local permanecem campos distintos; este
incremento não inventa regras de validação nem ativa adapters.

`GET /energy-imports/:id` também inclui os candidatos OCR associados às tentativas,
com origem/página e sinais separados; candidatos manuais existentes não são
misturados nessa coleção.

Validação: `pnpm test:integration` 104/104; suíte isolada do worker 3/3;
`pnpm check` aprovado; OpenAPI e cliente TypeScript regenerados; `git diff --check`
aprovado. Nenhuma migration foi necessária nesta fatia.

## Incremento 6B-1 — revisão manual pela web

Implementado em `feat/lote-6-review-ui`.

No dossiê do cliente, pessoas com permissão podem iniciar uma importação a partir
de uma conta READY e associá-la a uma UC existente. A tela mostra estado e
candidatos OCR quando disponíveis, mantém confiança/qualidade/validação em sinais
separados e permite revisar meses manualmente com `KEEP`, `INSERT` ou `REPLACE`,
incluindo versão e justificativa necessárias. Salvar revisão não altera leituras;
a confirmação chama o comando transacional existente e exibe o recibo. A URL
mantém cliente/importação para retomar em outra sessão ou dispositivo, sem estado
de negócio no armazenamento local.

Limites mantidos: o OCR continua desligado; não há criação de UC na revisão web;
os valores mensais ainda são digitados manualmente e os candidatos são mostrados
como evidência, sem seleção automática para a revisão. O documento original abre
em nova aba para comparação.

Validação: `pnpm check` aprovado; `pnpm test:e2e` 39/39, incluindo o fluxo
completo em 320, 360, 390, 768, 1024, 1366, 1440 e 1920 px. O contrato OpenAPI e
cliente foram regenerados para tipar corretamente os opcionais da revisão.

## Incremento 6B-2 — seleção assistida de candidatos mensais

A tela permite adicionar um mês por um candidato de referência e escolher
explicitamente o mês de destino para candidatos de consumo, injeção e total
faturado. O clique apenas preenche os campos editáveis da revisão; não define a
decisão `KEEP`/`INSERT`/`REPLACE`, não salva nem confirma. Campos sem mapeamento
mensal permanecem evidência para conferência no documento.

Validação E2E cobre seleção e edição posterior do valor antes da confirmação em
320, 360, 390, 768, 1024, 1366, 1440 e 1920 px. A API guarda os candidatos e
persiste na revisão os IDs selecionados por mês e campo. Valida vínculo com a
importação, compatibilidade do campo e mês, e rejeita reuso do mesmo candidato.
A proveniência continua recuperável pela leitura e sua revisão imutável, sem
copiar conteúdo bruto para a leitura operacional.

## Incremento 6B-3 — proveniência da revisão e retomada

A revisão da API aceita referências opcionais aos candidatos de referência,
consumo, injeção e total faturado. O servidor confere que cada candidato e sua
tentativa pertencem à mesma importação, que o campo é compatível e que o mês
normalizado corresponde. Os IDs ficam no JSON imutável da revisão, acessível
pela leitura criada e seu `sourceReviewId`, mesmo se a pessoa corrigir o valor
sugerido; o consumo operacional não recebe texto bruto OCR.

Ao reabrir uma revisão `REVIEW_REQUIRED` pela URL, a web restaura mês, decisão,
valores, justificativa e vínculos de candidatos do rascunho persistido. A pessoa
pode continuar editando e precisa salvar novamente antes de confirmar.

Validação: integração do importador 6/6, incluindo campo incompatível, candidato
de outra importação e leitura final corrigida em relação ao candidato; E2E 8/8
com retomada do rascunho e confirmação nos oito viewports.

## Incremento 6B-4 — criar UC na confirmação

A revisão pode iniciar sem UC e registrar, junto dos meses `INSERT`, os dados
cadastrais informados e confirmados pela pessoa: distribuidora, classe, modalidade,
conexão e tensão; código externo é opcional. A API exige `consumer_units:manage`
ao revisar e revalida a permissão ao confirmar. Não deriva defaults da fatura.

Salvar a revisão mantém a importação sem UC. A confirmação cria a UC, suas
leituras, o vínculo do documento ao dossiê da UC, auditoria e recibo na mesma
transação; falha reverte todos esses efeitos. A web permite retomar a revisão pela
URL com os campos da nova UC e meses preenchidos.

Validação: build da API aprovado; integração do importador 7/7, incluindo
persistência nula antes da confirmação e criação/vínculo/leitura após confirmação.
O OCR permanece desligado e nenhuma decisão de fornecedor ou custo foi tomada.

## Incremento 6A-7 — deduplicação por hash do original

O intake procura o SHA-256 entre importações do mesmo cliente e organização,
depois de validar acesso ao documento READY. Repetir bytes com outra versão
documental retorna `DUPLICATE_DOCUMENT` com ID/status apenas da importação já
autorizada, sem inserir novo job. A web oferece abrir esse resultado existente;
o acesso é novamente validado pelo GET contextual. Outros clientes não são
consultados nem afetados.

Validação: integração cobre replay idempotente e colisão do mesmo SHA com chave
nova; E2E percorre a oferta de abrir a importação existente após a confirmação.
O código de cliente e o acesso retornado permanecem limitados pelo escopo da API.
