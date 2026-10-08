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

Eventos candidatos: customer.created, lead.created, opportunity.created,
project.created, consumption.validated, proposal.generated, proposal.accepted,
contract.signed, inventory.reserved, finance.receivable_created.
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

- [ ] Inventariar audit events, ImportOutbox e projeções existentes.
- [ ] Publicar contratos versionados em packages/contracts.
- [ ] ADR de transporte e piloto outbox/inbox.
- [ ] Simular crash, duplicidade, atraso, replay e falha de consumidor.
- [ ] Definir backfill e métricas Gold após estabilizar a V1.
- [ ] Validar acesso, privacidade, retenção e reconciliação.

Referências: [Roadmap](../../docs/roadmap-refatoracao.md),
[Registro](../../docs/registro-features.md), [SPEC-012](../SPEC-012-automacoes-gestao/spec.md).
