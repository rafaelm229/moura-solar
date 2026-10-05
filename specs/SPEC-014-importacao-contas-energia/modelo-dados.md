# Modelo de dados — SPEC-014

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo e contratos funcionais aprovados em 05/10/2026. Decisões operacionais listadas no plano continuam bloqueios das liberações correspondentes.

## Entidades e invariantes

EnergyReading já tem organizationId, utilityUnitId, referenceMonth, consumptionKwh, injectedKwh, billedAmount, source e unicidade `(utilityUnitId, referenceMonth)`. Não tem versão explícita; o serviço atual faz upsert. Isso não garante revisão concorrente. Evolução proposta adiciona version e proveniência, mantendo a mesma fonte operacional e endpoint de consulta.

| Entidade proposta     | Conteúdo                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EnergyBillImport      | organização, customerId FK, utilityUnitId FK opcional, opportunityId FK opcional, documentVersionId FK, estado, version, actor, createdAt, cancellationRequestedAt, appliedAt                  |
| ExtractionAttempt     | importId FK, attemptNumber único, adapter/model/version, operationId externo, lease/heartbeat, início/fim, páginas, latência, custo estimado/real e moeda, erro seguro, próxima tentativa      |
| ExtractionCandidate   | attemptId FK, campo, valor bruto/normalizado, unidade, página/região, providerConfidence opcional e escala original, qualitySignals e systemValidation separados                               |
| ImportReview          | importId FK, revisão imutável, autor/data, decisões por campo/mês, IDs de ExtractionCandidate usados como evidência, valor anterior, valor confirmado, justificativa, versões de base e digest |
| EnergyReadingRevision | readingId FK, version, valores anteriores/novos, revisão/import/documentVersion FKs opcionais, autor/origem; append-only, também para mudanças manuais futuras                                 |
| ImportApplication     | importId único, revisão FK, payloadHash, recibo, IDs/versões aplicados, idempotencyKey, committedAt                                                                                            |
| ImportOutbox          | evento e chave únicos, payload mínimo, estado/lease/tentativas; gravado junto à mudança que publica                                                                                            |

Candidatos e revisão são evidência, não uma série de consumo paralela usada em cálculo. Endpoints manuais e importador devem usar o mesmo caso de uso transacional de leituras com versão. Não encadear N chamadas HTTP de upsert. EnergyReading conserva unicidade; valor faturado e injetado nulos não são zero.

## Mapeamento de candidatos (IMP-02 a IMP-04, IMP-08)

| Candidato presente                           | Destino após confirmação                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Distribuidora/código da UC                   | UtilityUnit.distributorName/externalCode texto; normalizar distribuidora com revisão, preservar zeros                                  |
| Titular/documento                            | Evidência da conta/revisão com acesso protegido; nunca Customer por inferência                                                         |
| Endereço                                     | Proposta de atualização do endereço da UC, sem alterar endereço cadastral silenciosamente                                              |
| Classe/subclasse, modalidade, ligação/tensão | Campos existentes compatíveis; subclasse/códigos não representáveis exigem evolução aditiva revisada; não converter tudo em COMMERCIAL |
| Referência/consumo mensal                    | EnergyReading.referenceMonth YYYY-MM e consumptionKwh decimal validado                                                                 |
| Energia injetada                             | EnergyReading.injectedKwh separado                                                                                                     |
| Total faturado                               | EnergyReading.billedAmount, sem derivar tarifa de economia                                                                             |
| Energia faturada e componentes tarifários    | Evidência estruturada da fatura/revisão; extensão tipada futura se necessária; não reutilizar consumptionKwh ou Survey.tariffPerKwh    |
| Histórico impresso                           | Somente meses/anos e valores identificáveis; ambiguidade fica para revisão, sem fabricar datas                                         |

Ausência de campo não aplica default residencial/bifásico/220V. Nova UC exige preenchimento humano dos campos obrigatórios do contrato atual. UC pode ser pré-cadastrada manualmente de modo explícito; se “criar ao confirmar” for escolhido, os dados ficam na revisão e a criação só ocorre na transação final. A intenção pode ficar ligada ao cliente sem UC até então. Arquivo aceito fica no dossiê mesmo se extração falhar/cancelar, sujeito à retenção.

## Duplicidade e atomicidade

Hash SHA-256 identifica bytes repetidos dentro da organização e cliente autorizado; resposta nunca revela arquivo de outro tenant. Hash igual permite reutilizar original e abrir resultado existente, sem aplicar novamente. Documento diferente com mesma distribuidora/código/referência alerta duplicidade semântica; considerar que pode ser revisão de fatura. UC+mês é chave de conflito operacional, não duplicidade de arquivo.

Revisão captura expectedVersion da UC, oportunidade e leituras ou expectativa explícita de ausência. Mês existente oferece manter ou substituir com motivo e versão de base; novo exige ausência. Transação final revalida permissões, cadeia cliente/UC/oportunidade, revisão e documento READY, bloqueia UC e meses em ordem estável, verifica CAS, cria UC/vínculo quando solicitado, aplica todas as leituras escolhidas, registra revisões, auditoria, recibo e outbox. Uma divergência reverte tudo e responde 409, preservando revisão para reabrir. Concorrência com cadastro manual participa dos mesmos locks/versões. Serialização/unique conflict vira erro recuperável, não último escritor vence.

Chaves escopadas e ImportApplication único impedem dupla aplicação mesmo com chaves diferentes. Replay de confirm com o mesmo reviewId/digest aplicado retorna 200 e recibo original após autorização, inclusive com outra chave de idempotência; pedido incompatível com a revisão aplicada retorna 409 IMPORT_ALREADY_APPLIED. Não permitir editar revisão aplicada; correção posterior é nova revisão de leitura auditada, não reexecutar importação antiga.

## Estados e processamento (IMP-10, IMP-12)

`QUEUED → PROCESSING → REVIEW_REQUIRED → CONFIRMING → APPLIED`.

UPLOADING é estado agregado da interface enquanto a intenção documental da SPEC-013 está pendente; ainda não existe EnergyBillImport. A entidade nasce em QUEUED somente com documentVersionId READY, conforme POST de criação. DocumentVersionId é imutável por importação; trocar o original exige nova versão documental e nova importação, preservando a anterior.
`FAILED` registra fase/código; `CANCELED` é terminal antes de APPLIED. CONFIRMING é estado lógico durante a transação e não pode ficar persistido sem recibo indefinidamente. REVIEW_REQUIRED com conflitos permanece revisável.

Fila só inicia após original READY. Gravar job/outbox no PostgreSQL; BullMQ/Redis é transporte futuro, não fonte de intenção. Worker usa lease renovável e CAS para assumir tentativa, persiste operationId antes de acompanhar resultado e recupera jobs abandonados. Resultados atrasados de tentativa cancelada/superada são descartados de forma auditada. Cancelar e confirmar concorrem com a mesma versão; apenas uma transição vence. Cancelamento externo é best effort, mas proíbe aplicação local posterior.

Defaults propostos para piloto: PDF/JPEG/PNG até 20 MiB e 10 páginas por conta; 2 jobs ativos por organização; até 3 tentativas totais em falha transitória, backoff 30 s/2 min com jitter; timeout por tentativa 120 s e teto global 10 min, parametrizáveis por adapter e quotas. Antes de reenvio com timeout incerto, consultar operationId para evitar cobrança repetida. Erro de credencial, formato e orçamento não entra em loop. Limite mensal de gasto/páginas por tenant bloqueia novos jobs com aviso e alternativa manual; valor do orçamento exige decisão humana.

Adapter `submit(documentRef,schemaVersion)`, `poll(operationId)`, `cancel(operationId)` quando suportado e `normalize(result)` retorna candidatos, posições, sinais e consumo de serviço. Worker não tem ferramentas/comandos de negócio acessíveis ao conteúdo extraído. Parser isolado, schema de saída permitido, proteção contra URLs arbitrárias/SSRF, scripts e prompt injection. Não executar instruções encontradas no PDF. Logs usam IDs, duração/páginas/custo e erro seguro; payload bruto protegido com política de retenção separada.

## Submissão externa ambígua

Persistir chave de correlação/tentativa antes de submit e operationId assim que recebido. Se o processo cair após o fornecedor aceitar e antes de registrar operationId, marcar tentativa como resultado desconhecido; usar idempotência/consulta por correlação quando suportada. Sem esse recurso, não reenviar automaticamente: operador decide nova tentativa com possível custo repetido explícito e dentro do teto. A durabilidade local não garante exatamente uma cobrança externa. T-IMP-07 cobre essa janela, inclusive ausência de operationId e adapter sem deduplicação.

## Vínculo documental na confirmação (IMP-01, IMP-06, IMP-07)

Na mesma transação de confirmação, inserir idempotentemente DocumentUtilityUnitLink entre o documento original e a UC confirmada (selecionada ou criada), validando cliente/organização e contexto da oportunidade. Documento que estava “UC a definir” passa a aparecer no filtro da UC sem copiar bytes ou alterar a versão original. Se já houver vínculo incompatível, recusar e exigir resolução antes de aplicar qualquer leitura; não mover o arquivo entre clientes. Falha ao criar esse vínculo reverte criação da UC/vínculo comercial, leituras, revisão aplicada e recibo.
