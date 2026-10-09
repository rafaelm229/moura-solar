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
- [x] Emitir `PROPOSAL_DELIVERED` v1 atomicamente com o registro manual de entrega, sem canal/destinatário ([R1-14](../../docs/r1-14-outbox-entrega-proposta.md)); validado localmente, CI pendente, sem dispatcher/consumidor.
- [ ] Definir e publicar contratos versionados dos demais fatos necessários em packages/contracts; R1-08 cobre somente `PROPOSAL_ACCEPTED`.
- [ ] Definir transporte, outbox/inbox e retenção somente quando houver produtor e consumidor justificados para um fluxo vigente. A PoC OCR foi encerrada pela [ADR-008](../../docs/adr/ADR-008-importacao-manual-sem-ocr.md); a proposta de transporte [ADR-007](../../docs/adr/ADR-007-transporte-integracao-proposta.md) é histórica e não autoriza ativação.
- [ ] Simular crash, duplicidade, atraso, replay e falha de consumidor.
- [ ] Definir backfill e métricas Gold após estabilizar a V1.
- [ ] Validar acesso, privacidade, retenção e reconciliação.

Referências: [Roadmap](../../docs/roadmap-refatoracao.md),
[Registro](../../docs/registro-features.md), [SPEC-012](../SPEC-012-automacoes-gestao/spec.md).
