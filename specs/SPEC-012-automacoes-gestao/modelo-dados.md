# Modelo de dados — Automações e gestão

## Entidades

### AutomationRuleVersion

- `id`, `tenantId`, `ruleKey`, `version`, `name`, `description`
- `status`, `triggerEvent`, `conditions`, `actions`
- `validFrom`, `validTo?`, `timezone`, `businessCalendarId?`
- `createdBy`, `approvedBy?`, `createdAt`

Condições e ações usam esquema validado e versionado. Código arbitrário do
usuário não é executado no servidor.

### AutomationExecution

- `id`, `tenantId`, `ruleVersionId`, `eventId`
- `idempotencyKey`, `status`, `attempt`, `startedAt`, `finishedAt?`
- `inputReference`, `resultSummary?`, `errorCode?`, `nextAttemptAt?`
- `traceId`

Há unicidade por `tenantId + idempotencyKey`.

### AttentionItem

- `id`, `tenantId`, `sourceType`, `sourceId`, `kind`, `severity`
- `title`, `reasonCode`, `status`, `dueAt?`
- `assigneeId?`, `teamId?`, `resolvedAt?`, `resolutionReason?`
- `deduplicationKey`, `occurrenceCount`, `lastOccurredAt`

### Notification

- `id`, `tenantId`, `recipientId`, `channel`, `templateVersionId`
- `subject?`, `payload`, `status`, `scheduledAt`, `sentAt?`, `readAt?`
- `providerReference?`, `failureCode?`, `idempotencyKey`

O payload é mínimo e não contém segredos.

### NotificationPreference

- `id`, `tenantId`, `userId`, `category`, `channel`
- `enabled`, `quietHours?`, `timezone`, `updatedAt`

Categorias obrigatórias ignoram desativação, conforme política registrada.

### MetricDefinitionVersion

- `id`, `metricKey`, `version`, `name`, `description`
- `unit`, `formula`, `dimensions`, `sourceEvents`
- `competenceRule`, `refreshPolicy`, `validFrom`, `validTo?`

### MetricProjection

- `id`, `tenantId`, `metricKey`, `definitionVersionId`
- `period`, `dimensions`, `value`, `calculatedAt`
- `sourceWatermark`, `revision`

Projeções podem ser reconstruídas a partir das fontes oficiais.

### GoalVersion

- `id`, `tenantId`, `metricKey`, `scopeType`, `scopeId?`
- `periodStart`, `periodEnd`, `targetValue`, `unit`
- `version`, `status`, `createdBy`, `approvedBy?`

### AuditEntry

- `id`, `tenantId`, `occurredAt`, `actorType`, `actorId?`
- `action`, `entityType`, `entityId`, `reason?`
- `before?`, `after?`, `requestId?`, `traceId?`, `ipHash?`

Campos sensíveis são removidos ou mascarados antes da persistência.

### IntegrationDelivery

- `id`, `tenantId`, `integrationId`, `eventId`, `status`
- `attempt`, `nextAttemptAt?`, `responseCode?`, `errorCode?`
- `idempotencyKey`, `createdAt`, `completedAt?`

## Estados essenciais

- Regra: `RASCUNHO`, `ATIVA`, `PAUSADA`, `ENCERRADA`.
- Execução: `PENDENTE`, `EXECUTANDO`, `CONCLUIDA`, `RETRY`, `FALHA`, `IGNORADA`.
- Atenção: `ABERTA`, `EM_TRATAMENTO`, `RESOLVIDA`, `DESCARTADA`.
- Notificação: `AGENDADA`, `ENVIANDO`, `ENVIADA`, `ENTREGUE`, `FALHA`,
  `CANCELADA`.

## Restrições e consistência

- Todas as consultas aplicam isolamento por tenant.
- Definições ativas não são alteradas no lugar; recebem nova versão.
- Datas agendadas são armazenadas em UTC com fuso de interpretação registrado.
- Valores monetários e percentuais seguem as convenções das SPECs de origem.
- Projeções nunca substituem registros transacionais.
- Reprocessamento cria nova tentativa e preserva as anteriores.
- Exclusão de regra é lógica; auditoria e execuções são imutáveis.

## Índices recomendados

- execução por status/próxima tentativa/regra;
- atenção por responsável/equipe/status/prazo/severidade;
- notificação por destinatário/status/agendamento;
- projeção por métrica/período/dimensões;
- auditoria por entidade/ator/data;
- entrega por integração/status/próxima tentativa.
