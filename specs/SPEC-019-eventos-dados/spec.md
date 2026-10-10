# SPEC-019 — Eventos de integração e plataforma de dados

**Versão:** 0.1.0

**Data:** 07/10/2026

**Status:** Escopo de roadmap; transporte e modelos em especificação

**Fases:** contratos em R1, consumidores por domínio, analytics em R11

**Dependências:** SPEC-000, SPEC-012 e SPEC-016

## Objetivo

Tornar integrações duráveis, rastreáveis e idempotentes; produzir dados analíticos
reconciliáveis sem transformar BI em fonte de verdade operacional.

## Contratos de integração

Envelope proposto: eventId, eventType, schemaVersion, occurredAt, organizationId,
aggregateId, aggregateVersion quando aplicável, producer, correlationId,
causationId e payload validado. Minimizar dados pessoais. Controle de ordenação e
particionamento deve ser definido por agregado. Horário de ingestão difere do fato.

R1-01 inicia apenas o [envelope compartilhado](../../docs/r1-contratos-integracao-2026-10-08.md)
em `packages/contracts`. A validação estrutural não valida `eventType`, versão ou
payload específicos nem publica eventos. O `ImportOutbox` legado permanece com
seu formato até adaptação explícita e testada.

O [R1-02](../../docs/r1-correlacao-import-outbox-2026-10-08.md) persiste a
correlação de origem nas novas linhas do `ImportOutbox` existente. Linhas antigas
continuam válidas com correlação ausente; isto não ativa publicação ou inbox.

O [R1-03](../../docs/r1-versionamento-outbox-import-2026-10-08.md) declara
`schema_version = 1` para os eventos novos de intake/retry e confirmação da
importação. Linhas anteriores permanecem sem versão declarada; nenhum evento é
publicado ou processado por consumidor ativo.

O [R1-04](../../docs/r1-validacao-eventos-import-2026-10-08.md) valida em runtime
tipo, versão e campos mínimos dos dois payloads v1 conhecidos em
`packages/contracts`. O parser não é invocado por consumidor operacional e
rejeita versão legada/desconhecida até que política explícita seja definida.

O [R1-07](../../docs/r1-guard-evento-import-2026-10-08.md) conecta o parser ao
preparo futuro de tentativas e limita claims aos eventos QUEUED v1 com IDs
coerentes com importação e versão documental. Eventos incompatíveis permanecem
intocados e o entrypoint do worker continua sem consumidor ativo.

O [R1-08](../../docs/r1-08-contrato-aceite-proposta.md) adiciona o contrato
versionado de `PROPOSAL_ACCEPTED` em `packages/contracts`. Ele não publica o fato,
altera a transação atual de aceite nem escolhe consumidor ou transporte.

O [R1-09](../../docs/r1-09-outbox-aceite-proposta.md) persiste o evento v1 na
mesma transação local do aceite. A linha ainda não é despachada e não ativa
worker, transporte ou consumidor.

O [R1-10](../../docs/r1-10-outbox-cadastro-cliente.md) valida e persiste
`CUSTOMER_CREATED` v1 na mesma transação local do cadastro, com payload mínimo
sem dados pessoais. O PR #35 foi consolidado; a linha permanece não publicada.

O [R1-11](../../docs/r1-11-outbox-criacao-oportunidade.md) valida e persiste
`OPPORTUNITY_CREATED` v1 na transação local que cria oportunidade e atividade
inicial. O payload contém apenas identificadores e permanece não publicado.

O [R1-12](../../docs/r1-12-outbox-criacao-uc.md) valida e persiste
`UTILITY_UNIT_CREATED` v1 no caminho transacional comum à criação direta e à
criação/vínculo de UC, usando IDs mínimos. O evento permanece não publicado.

O [R1-13](../../docs/r1-13-outbox-criacao-proposta.md) registra
`PROPOSAL_CREATED` v1 junto da proposta, versão inicial e auditoria. O evento
significa criação do registro; geração e prontidão do PDF são posteriores e não
são prometidas por esse contrato.

O [R1-14](../../docs/r1-14-outbox-entrega-proposta.md) registra
`PROPOSAL_DELIVERED` v1 na mesma transação que persiste a entrega manual, os
efeitos de estado e a atividade de acompanhamento. O evento não envia mensagem
nem confirma recebimento.

O [R1-15](../../docs/r1-15-outbox-nova-versao-proposta.md) registra
`PROPOSAL_VERSION_CREATED` v1 junto da nova versão e
auditoria. O payload mínimo conserva `basedOnVersionId` e IDs do agregado; não
carrega snapshots ou valores. A geração do PDF permanece posterior e não é
prometida pelo evento; foi consolidado no PR #41 com CI completa.

O [R1-16](../../docs/r1-16-outbox-qualificacao-oportunidade.md) registra
`OPPORTUNITY_QUALIFIED` v1 junto da transição CRM existente,
com o ID da transição como deduplicação. O evento declara a passagem de `NOVO`
para `QUALIFICADO`, sem resumo comercial nem texto de atividade; implementação
foi consolidada no PR #42 com CI completa.

O R1-17 registra `OPPORTUNITY_LOST` v1 junto da transição CRM existente, com o
ID da transição como deduplicação. O payload omite motivo e observações de
perda; implementação em andamento.

Eventos candidatos: lead.created, project.created, consumption.validated,
proposal.generated, contract.signed, inventory.reserved,
finance.receivable_created.
São nomes propostos, não promessa de eventos já publicados. Mapear eventos PascalCase
existentes, especificar semântica e versionar adaptação. Identificar assinatura
recebida versus conferida e títulos criados versus liquidados.

## Durabilidade e execução

Outbox na mesma transação do fato; consumidor confirma após efeito durável;
inbox/deduplicação por organização+consumidor+eventId ou escopo definido.
Entrega pelo menos uma vez exige idempotência; não prometer exactly-once global.
Retentativas com limites, fila de falhas, reprocessamento autorizado, logs/métricas
e replay seguro. Eventos fora de ordem e schema desconhecido têm política explícita.
Saga registra etapa, timeout, erro, compensação e reconciliação.

Transporte/broker ainda pendente de ADR por consumidor necessário. Redis/BullMQ
atuais são uma opção para jobs, não escolha automática de barramento geral.
Não instalar vários brokers por antecipação.

## Camadas analíticas

| Camada | Conteúdo                                                      | Prova                                                          |
| ------ | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Bronze | Eventos/ingestões preservados com metadados e acesso restrito | Integridade, atraso, duplicação e replay                       |
| Silver | Dados normalizados/deduplicados, relações e histórico         | Qualidade, schema e reconciliação com donos operacionais       |
| Gold   | Métricas comerciais/financeiras/estoque versionadas           | Definição, período/fuso/unidade, linhagem e tabela equivalente |

Banco/schema/objeto analítico será escolhido por volume, custo e necessidade.
Não presumir lakehouse, streaming contínuo ou plataforma paga.
Dados históricos necessários exigem backfill reconciliado, não inferência de
eventos ausentes. Retenção e exclusão propagadas conforme políticas definidas.

## Métricas e acesso

Preservar indicadores oficiais da SPEC-012: comercial, proposta, conversão,
receita, margem, caixa, inadimplência, estoque e operação conforme escopo.
Distinguir preço proposto, receita contratada, título, recebimento e custo realizado.
Gold não escreve status/gates nos sistemas operacionais. Projeção desatualizada
mostra freshness/atraso; usuários só veem organização e escopo autorizados.

## Requisitos e aceite

| ID     | Critério                                                               |
| ------ | ---------------------------------------------------------------------- |
| EVT-01 | Fato+outbox não perde evento em crash/restart                          |
| EVT-02 | Duplicata/retry não duplica efeito e inbox fica auditável              |
| EVT-03 | Versão desconhecida/out-of-order/falha têm tratamento demonstrado      |
| EVT-04 | Saga compensa/reconcilia falha parcial sem inventar conclusão          |
| EVT-05 | CorrelationId permite acompanhar jornada completa                      |
| DAT-01 | Bronze/Silver/Gold têm linhagem, schema e qualidade documentados       |
| DAT-02 | KPIs reconciliam com origem e diferenciam fatos financeiros            |
| DAT-03 | Backfill/replay produz resultado equivalente sem duplicatas            |
| DAT-04 | Permissões/retenção/exclusão e dados sensíveis têm tratamento definido |

## Tarefas

- [x] Inventariar audit events, ImportOutbox e projeções existentes ([R1-05](../../docs/r1-inventario-integracao-2026-10-08.md)); inventário limitado aos caminhos localizados, sem escolha de transporte/consumidor.
- [x] Persistir `PROPOSAL_ACCEPTED` v1 na outbox local, atomicamente com aceite ([R1-09](../../docs/r1-09-outbox-aceite-proposta.md)); sem dispatcher/consumidor.
- [x] Emitir `CUSTOMER_CREATED` v1 atomicamente com o cadastro, sem PII no evento ([R1-10](../../docs/r1-10-outbox-cadastro-cliente.md)); consolidado no PR #35, sem dispatcher/consumidor.
- [x] Emitir `OPPORTUNITY_CREATED` v1 atomicamente com oportunidade/atividade inicial, sem texto comercial no evento ([R1-11](../../docs/r1-11-outbox-criacao-oportunidade.md)); consolidado no PR #36, sem dispatcher/consumidor.
- [x] Emitir `UTILITY_UNIT_CREATED` v1 atomicamente com criação/vínculo de UC, sem códigos de conta ou dados legíveis no evento ([R1-12](../../docs/r1-12-outbox-criacao-uc.md)); consolidado no PR #37, sem dispatcher/consumidor.
- [x] Emitir `PROPOSAL_CREATED` v1 atomicamente com proposta e versão inicial, sem snapshots ou valores comerciais no evento ([R1-13](../../docs/r1-13-outbox-criacao-proposta.md)); consolidado no PR #39, sem dispatcher/consumidor.
- [x] Emitir `PROPOSAL_DELIVERED` v1 atomicamente com o registro manual de entrega, sem canal/destinatário ([R1-14](../../docs/r1-14-outbox-entrega-proposta.md)); consolidado no PR #40, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `PROPOSAL_VERSION_CREATED` v1 atomicamente com nova versão e auditoria, preservando linhagem por IDs sem snapshots/preço ([R1-15](../../docs/r1-15-outbox-nova-versao-proposta.md)); consolidado no PR #41, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `OPPORTUNITY_QUALIFIED` v1 atomicamente com a transição persistida, sem texto comercial ou de atividade ([R1-16](../../docs/r1-16-outbox-qualificacao-oportunidade.md)); consolidado no PR #42, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `OPPORTUNITY_LOST` v1 atomicamente com transição persistida, sem motivo/observações ([R1-17](../../docs/r1-17-outbox-perda-oportunidade.md)); consolidado no PR #43, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `OPPORTUNITY_REOPENED` v1 atomicamente com transição persistida, sem justificativa ([R1-18](../../docs/r1-18-outbox-reabertura-oportunidade.md)); consolidado no PR #44, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `PROPOSAL_REJECTED` v1 atomicamente com status e auditoria, sem motivo/notas ([R1-19](../../docs/r1-19-outbox-rejeicao-proposta.md)); consolidado no PR #46, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `CUSTOMER_ARCHIVED` e `CUSTOMER_RESTORED` v1 atomicamente com status e auditoria, sem dados pessoais ([R1-20](../../docs/r1-20-outbox-arquivo-restauracao-cliente.md)); consolidado no PR #48, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `UTILITY_UNIT_UPDATED` v1 atomicamente com atualização versionada e auditoria, sem dados da conta ou atributos técnicos ([R1-21](../../docs/r1-21-outbox-atualizacao-uc.md)); consolidado no PR #49, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `CUSTOMER_UPDATED` v1 atomicamente com atualização versionada e auditoria, sem PII ou texto comercial ([R1-22](../../docs/r1-22-outbox-atualizacao-cliente.md)); consolidado no PR #51, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `OPPORTUNITY_UPDATED` v1 atomicamente com atualização versionada e auditoria, sem texto ou valores comerciais ([R1-23](../../docs/r1-23-outbox-atualizacao-oportunidade.md)); consolidado no PR #53, CI completa verde, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 atomicamente com criação e auditoria, apenas IDs e sem assunto/descrição/responsável/vencimento ([R1-24](../../docs/r1-24-outbox-criacao-atividade.md)); consolidado no PR #55, CI #111 completa verde, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CANCELED` v1 atomicamente com cancelamento e auditoria, apenas IDs e sem justificativa/dados da atividade ([R1-25](../../docs/r1-25-outbox-cancelamento-atividade.md)); consolidado no PR #57, CI #113 completa verde, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_COMPLETED` v1 atomicamente com conclusão/auditoria e ID opcional do follow-up, sem resultado/notas/texto ([R1-26](../../docs/r1-26-outbox-conclusao-atividade.md)); consolidado no PR #59, merge `56b3074`, CI #115 completa verde, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_RESCHEDULED` v1 atomicamente com reagendamento/auditoria e IDs de vínculos presentes, sem vencimento/notas/texto ([R1-27](../../docs/r1-27-outbox-reagendamento-atividade.md)); consolidado no PR #61, merge `35d49dc`, CI #117 completa verde, sem dispatcher/consumidor.
- [x] Emitir também `ACTIVITY_CREATED` v1 quando a primeira atividade nasce no comando atômico de criação da oportunidade, compartilhando a auditoria do comando e sem payload operacional ([R1-28](../../docs/r1-28-outbox-primeira-atividade-oportunidade.md)); consolidado no PR #63, merge `ac139dc`, CI #119 completa verde, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 para o follow-up opcional criado durante a qualificação da oportunidade, compartilhando a auditoria do comando e sem payload operacional ([R1-29](../../docs/r1-29-outbox-followup-qualificacao.md)); consolidado no PR #65, merge `cad433e`, validação local passou; CI #121 e repetição falharam antes dos testes por rate limit do Docker Hub, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 para o follow-up opcional criado ao concluir uma atividade, compartilhando a auditoria do comando e sem payload operacional ([R1-30](../../docs/r1-30-outbox-followup-conclusao-atividade.md)); consolidado no PR #67, merge `c31ba5f`, validação local passou; CI #123 e repetição falharam antes dos testes por rate limit do Docker Hub, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 para o follow-up automático do registro de entrega de proposta, compartilhando a auditoria do comando e sem payload operacional ([R1-31](../../docs/r1-31-outbox-followup-entrega-proposta.md)); consolidado no PR #69, merge `fcb2b96`; CI #125 não iniciou checkout/testes por falha ao baixar `postgres:17-alpine`, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 para a atividade de formalização criada pelo aceite da proposta, compartilhando a auditoria `PROPOSAL_ACCEPTED` e sem payload operacional ([R1-32](../../docs/r1-32-outbox-atividade-formalizacao-proposta.md)); consolidado no PR #71, merge `ceb84ad`; CI #127 não iniciou checkout/testes por timeout no pull de `postgres:17-alpine`, sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 para o follow-up criado ao registrar entrega de contrato, compartilhando a auditoria `CONTRACT_DELIVERED` e sem payload operacional ([R1-33](../../docs/r1-33-outbox-followup-entrega-contrato.md)); consolidado no PR #73, merge `33f7213`; CI #129 falhou antes dos testes por timeout de Postgres, repetição CI #130 no PR documental #74 passou completa; sem dispatcher/consumidor.
- [x] Emitir `ACTIVITY_CREATED` v1 para a atividade criada pela aprovação ou rejeição humana da conferência de contrato, compartilhando a auditoria e sem payload operacional ([R1-34](../../docs/r1-34-outbox-atividade-conferencia-contrato.md)); consolidado no PR #75, merge `431a8a4`, CI #131 completa verde; sem dispatcher/consumidor.
- [x] Emitir `CATALOG_ITEM_CREATED` e `CATALOG_ITEM_UPDATED` v1 na mesma transação local de CatalogItem e auditoria, com IDs e versão apenas ([R1-35](../../docs/r1-35-outbox-eventos-catalogo.md)); consolidado no PR #77, merge `2680bff`, CI #133 completa verde, sem dispatcher/consumidor.
- [x] Emitir `CONTRACT_DELIVERED` v1 atomicamente com o registro manual da entrega, auditoria e follow-up, apenas IDs e sem canal/destinatário ([R1-36](../../docs/r1-36-outbox-entrega-contrato.md)); consolidado no PR #79, merge `0a246e8`, CI #135 completa verde, sem envio externo ou consumidor.
- [x] Emitir `CONTRACT_CANCELED` v1 atomicamente com estado e auditoria, apenas IDs e sem motivo/observações ([R1-37](../../docs/r1-37-outbox-cancelamento-contrato.md)); consolidado no PR #81, merge `7ff3b85`, CI #137 completa verde; sem dispatcher/consumidor.
- [x] Emitir `CONTRACT_AMENDMENT_RECORDED` v1 atomicamente com o registro manual existente e sua auditoria, apenas IDs e sem motivo/detalhes do aditivo ([R1-38](../../docs/r1-38-outbox-registro-aditivo-contrato.md)); consolidado no PR #83, merge `1d4373c`, CI #139 verde, sem documento de aditivo ou consumidor.
- [x] Emitir `CONTRACT_SIGNED_REVIEWED` v1 atomicamente com a decisão humana da conferência do assinado, IDs e resultado `VERIFIED`/`REJECTED`, sem checklist, observação ou motivo ([R1-39](../../docs/r1-39-outbox-conferencia-assinado.md)); consolidado no PR #85, merge `0dcf7eb`, CI #141 verde, sem consumidor ou efeito financeiro.
- [x] Emitir `CONTRACT_SIGNED_UPLOADED` v1 e `ACTIVITY_CREATED` para a atividade de conferência, atomicamente com o registro local do upload manual, sem metadados/bytes do arquivo e sem liberar gates ([R1-40](../../docs/r1-40-outbox-upload-assinado.md)); consolidado no PR #87, merge `dacf0f67da94de33df816f03dfbfc244055d2df5`, CI run `38010236121` verde; armazenamento externo permanece fora da transação local.
- [x] Emitir `CONTRACT_CREATED` v1 e `ACTIVITY_CREATED` atomicamente com a criação do contrato, versão, atividade e auditoria, usando somente IDs e sem alterar gates/efeitos financeiros ([R1-41](../../docs/r1-41-outbox-contrato-criado.md)); consolidado no PR #89, merge `40d7ea242ce6e7ee9486d816009ec0d747c945f5`, CI run `38012077654` verde.
- [x] Emitir eventos `CONTRACT_REVIEW_REQUESTED` e `CONTRACT_APPROVED` v1, atomicamente com estado/auditoria, usando somente IDs e preservando notas/gates ([R1-42](../../docs/r1-42-outbox-revisao-aprovacao-contrato.md)); consolidado no PR #91, merge `1eefd1e`, CI run `38013650317` verde.
- [x] Demonstrar que eventos confirmados e auditoria sobrevivem ao encerramento abrupto e reinício da API, mantendo correlação e IDs ([R1-43](../../docs/r1-43-durabilidade-outbox-restart.md)); consolidado no PR #93, merge `833132b`, CI run `38015253401` verde; sem provar publicação/consumo, retry ou replay.
- [ ] Definir e publicar contratos versionados compatíveis com o envelope compartilhado para os eventos legados de importação; os parsers de payload v1 existem, mas correlação ainda fica na coluna `ImportOutbox` ([R1-44](../../docs/r1-44-auditoria-contratos-eventos.md)); adaptar somente com caso de consumo justificado.
- [x] Auditar cobertura dos nomes de eventos atuais: 32/32 nomes de produtores encontram tipo de payload v1 e parser/exportação em `packages/contracts` ([R1-44](../../docs/r1-44-auditoria-contratos-eventos.md)); dois eventos de importação continuam no formato legado sem envelope R1-01.
- [x] Proteger essa cobertura contra regressão com comparação AST dos produtores, tipos, parsers v1 e reexports ([R1-52](../../docs/r1-52-paridade-produtores-contratos-eventos.md)); sem lista paralela nem mudança de runtime; consolidado no PR #110, CI run `38059702872` verde.
- [x] Verificar `schemaVersion: 1` e presença de `correlationId` conforme o tipo de evento; a exceção legada de importação conserva correlação fora do payload ([R1-53](../../docs/r1-53-metadados-versao-correlacao-eventos.md)); sem transporte ou consumidor; PR #112 consolidado, CI run `38061362980` verde.
- [x] Proteger o literal `schemaVersion: 1` em todos os tipos `*EventV1` pelo checker TypeScript ([R1-54](../../docs/r1-54-literal-schema-version-contracts.md)); sem alterar contrato/runtime ou habilitar consumidores; PR #114 consolidado, CI run `38063156490` verde.
- [x] Exigir `correlationId: string` não opcional nos contratos v1 que usam o envelope compartilhado, preservando o formato legado de importação ([R1-55](../../docs/r1-55-required-correlation-contract.md)); sem alteração de runtime ou ativação de consumidor; PR #116 consolidado, CI run `38064576360` verde.
- [x] Testar ausência e string em branco em todos os campos textuais obrigatórios do envelope compartilhado ([R1-56](../../docs/r1-56-required-envelope-fields.md)); sem alterar o parser/runtime ou ativar consumidores; PR #118 consolidado em `ca6c842`, CI run `38066193240` verde após rerun.
- [x] Testar rejeição de valores não objeto, limites de inteiros positivos seguros e `causationId` inválido, mantendo opcionais os campos ausentes ([R1-57](../../docs/r1-57-envelope-optional-metadata.md)); sem alterar parser/runtime ou ativar consumidores; PR #120 consolidado em `4820783`, CI run `38068246864` verde.
- [x] Testar payload ausente e tipos não objeto com o parser do envelope compartilhado ([R1-58](../../docs/r1-58-payload-object-boundaries.md)); sem alterar parser/runtime ou ativar consumidores; PR #122 consolidado em `ca716cd`, CI run `38069720776` verde.
- [x] Estabilizar a asserção do payload mínimo de `OPPORTUNITY_UPDATED`, verificando ausência de `estimatedConsumption` sem varrer UUIDs por substring ([R1-59](../../docs/r1-59-stable-payload-assertion.md)); sem alterar contrato/runtime ou ativar consumidores; PR #124 consolidado em `e4abfd5`, CI run `38071336282` verde.
- [x] Demonstrar que a confirmação humana da importação e suas leituras, recibo, auditoria e linhas `ImportOutbox` permanecem íntegros após `SIGKILL` e reinício da API ([R1-45](../../docs/r1-45-durabilidade-importacao-manual-restart.md)); consolidado no PR #97, merge `398421f`, CI run `38018885259` verde; sem worker, publicação ou consumidor.
- [x] Injetar falha ao gravar `ENERGY_BILL_IMPORT_APPLIED` e comprovar rollback de confirmação, leituras, recibo, auditoria, transição e outbox antes de repetir a confirmação manual ([R1-46](../../docs/r1-46-rollback-confirmacao-importacao.md)); teste local 8/8, integração completa 125/125 e `pnpm check` passaram; PR #98 consolidado em `8a06bab`, CI run `38019743039` verde; sem consumidor.
- [x] Rejeitar campos fora do contrato mínimo dos eventos manuais `ENERGY_BILL_IMPORT_QUEUED` e `ENERGY_BILL_IMPORT_APPLIED`, sem alterar o formato legado válido ([R1-47](../../docs/r1-47-contrato-minimo-eventos-importacao.md)); PR #100 consolidado em `f002335`, CI run `38021146046` verde; worker/consumidor inativos.
- [ ] Definir transporte, outbox/inbox e retenção somente quando houver produtor e consumidor justificados para um fluxo vigente. A PoC OCR foi encerrada pela [ADR-008](../../docs/adr/ADR-008-importacao-manual-sem-ocr.md); a proposta de transporte [ADR-007](../../docs/adr/ADR-007-transporte-integracao-proposta.md) é histórica e não autoriza ativação.
- [ ] Simular crash, duplicidade, atraso, replay e falha de consumidor.
- [ ] Definir backfill e métricas Gold após estabilizar a V1.
- [ ] Validar acesso, privacidade, retenção e reconciliação.

Referências: [Roadmap](../../docs/roadmap-refatoracao.md),
[Registro](../../docs/registro-features.md), [SPEC-012](../SPEC-012-automacoes-gestao/spec.md).
