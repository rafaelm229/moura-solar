# API proposta — SPEC-014

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo e contratos funcionais aprovados em 05/10/2026. Decisões operacionais listadas no plano continuam bloqueios das liberações correspondentes.

Prefixo `/api/v1`. Autenticação M1; permissões propostas `energy_imports:create/read/review/confirm/cancel/retry`, combinadas com `consumer_units:manage`, leitura do cliente e permissão documental por contexto. Atualizar/vincular oportunidade exige também `opportunities:update`. A revisão não concede poder de confirmação. Tudo novo nesta tabela.

| Método/caminho                               | Entrada                                                                                                            | Saída                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| POST `/customers/:customerId/energy-imports` | documentVersionId READY da SPEC-013; utilityUnitId opcional ou intenção createOnConfirm; opportunityId opcional    | 201 importId, version, QUEUED e statusUrl; original não é reenviado em base64 |
| GET `/energy-imports/:id`                    | ID contextual                                                                                                      | estado, documento, tentativas/sinais seguros, candidatos e versão da revisão  |
| PUT `/energy-imports/:id/review`             | expectedVersion, campos escolhidos, leituras/decisões, versões de base, justificativas e `newUtilityUnit` opcional | 200 revisão/digest, divergências e versão; nenhuma aplicação operacional      |
| POST `/energy-imports/:id/confirm`           | expectedVersion, reviewId, reviewDigest                                                                            | 200 APPLIED e recibo com UC/leitura IDs/versões, warnings e appliedAt         |
| POST `/energy-imports/:id/retry`             | expectedVersion, motivo                                                                                            | 202 QUEUED ou operationId retomado; apenas falha recuperável                  |
| POST `/energy-imports/:id/cancel`            | expectedVersion, motivo                                                                                            | 200 CANCELED; APPLIED retorna 409                                             |

Exemplo de decisão de mês: `{referenceMonth:"2026-08", decision:"REPLACE", expectedReadingVersion:3, consumptionKwh:"421.50", injectedKwh:null, reason:"Conferido na página 1", evidence:{referenceMonthCandidateId:"…", consumptionKwhCandidateId:"…"}}`. `evidence` é opcional; cada ID deve pertencer à mesma importação e ao campo correspondente, e a referência deve normalizar para o mês da decisão. A revisão persiste os vínculos com seus valores finais, inclusive quando a pessoa corrige um valor sugerido. Para INSERT, expectedReadingVersion é null e exige ausência; KEEP não escreve a leitura. Números decimais são strings canônicas no contrato novo e a adaptação ao DTO atual é responsabilidade da API. O servidor rejeita mês inválido, valores negativos, unidade ambígua e campo não permitido. Alteração cadastral só inclui campos explicitamente selecionados, com versão de base.

Idempotency-Key obrigatório em POST/PUT mutáveis. Mesma chave com mesmo payload retorna resultado original autorizado; chave reutilizada com payload diferente dá 409. Unicidade da aplicação por importação protege inclusive chaves diferentes. Retentativas do cliente não geram nova chave. Revisão e confirmação validam ownership novamente, não confiam nos IDs recebidos ou nos campos do extrator.

401 sessão; 403 capacidade; 404 contexto ausente/fora do escopo; 409 CONCURRENT_MODIFICATION, IMPORT_ALREADY_APPLIED (pedido incompatível com revisão já aplicada) ou DUPLICATE_DOCUMENT com referência somente autorizada; 422 REVIEW_REQUIRED, UNRESOLVED_CONFLICT, INVALID_REVIEW_EVIDENCE, INVALID_MONTH, INVALID_MEASUREMENT, DOCUMENT_NOT_READY; 429 IMPORT_QUOTA_EXCEEDED; 503 EXTRACTOR_UNAVAILABLE. Erros usam `{code,message,details,traceId}`. Duplicidade semântica gera conflito para decisão humana; não aplica silenciosamente.

Após timeout da confirmação, consultar importação/recibo antes de reenviar. Não executar extração externa dentro da transação final. Aplicação grava outbox e marca cálculos de rascunho afetados como necessitando revisão quando adequado; não recalcula versão aprovada. UI invalida `energy-readings`, `customer-utility-units`, `opportunity`, `opportunities`, levantamentos/designs e projeções de jornada pertinentes. Segundo dispositivo revalida ao focar/retomar e após polling; sem promessa de atualização em tempo real já existente.

O cadastro manual continua nas rotas atuais `/customers/:customerId/utility-units` e `/utility-units/:id/readings`. Antes de habilitar importador, evoluir sua concorrência sem quebrar os clientes atuais e testar compatibilidade. Os atuais POST UC + PATCH oportunidade não serão usados para a confirmação atômica; propor caso de uso interno compartilhado com transação única.

## Recuperação inequívoca

GET `/energy-imports/:id` retorna também `applicationReceipt` (null antes da aplicação; depois, importId, reviewId, reviewDigest, appliedAt, utilityUnitId e IDs/versões das leituras). Confirm repetido com o mesmo reviewId/digest aplicado retorna 200 e esse recibo mesmo usando outra chave; expectedVersion anterior não invalida esse replay reconhecido. Payload incompatível com a revisão aplicada retorna 409 IMPORT_ALREADY_APPLIED. Mesma chave com payload diferente continua 409 IDEMPOTENCY_KEY_REUSED. Toda recuperação revalida permissão/contexto.

A API não cria importação em UPLOADING. Primeiro conclui-se o upload pela SPEC-013, depois POST com documento READY cria QUEUED. Retry usa exclusivamente o mesmo original imutável e só recupera falha transitória/tentativa incerta resolvida. Ilegibilidade exige nova versão pelo dossiê e POST de nova importação com novo documentVersionId; nenhuma revisão humana é transportada automaticamente. Importação anterior é preservada/cancelada conforme estado.

O recibo só é gravado após vincular o documento à UC por DocumentUtilityUnitLink na mesma transação operacional. Essa vinculação utiliza o contexto já autorizado da conta, não um grant irrestrito de edição documental.

Quando a importação ainda não possui `utilityUnitId`, a revisão pode incluir `newUtilityUnit` com distribuidora e valores humanos explícitos de classe, modalidade tarifária, tipo de conexão e tensão; código externo é opcional. Essa operação requer `consumer_units:manage` na revisão e novamente na confirmação. Só são aceitos meses `INSERT`, sem versão de leitura existente. A UC não é criada ao iniciar importação nem ao salvar a revisão: criação, leituras, vínculo documental, recibo e estado `APPLIED` são uma única transação. Falha ou conflito deixa a importação sem UC e sem leitura aplicada.
