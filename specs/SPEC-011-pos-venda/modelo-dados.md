# Modelo de dados — Pós-venda

## Agregados

### SupportCase

- `id`, `tenantId`, `number`, `customerId`, `projectId?`, `installationId?`
- `equipmentId?`, `type`, `status`, `priority`, `channel`
- `title`, `description`, `impact`, `reportedAt`, `dueAt?`
- `assigneeId?`, `teamId?`, `servicePolicySnapshot`
- `probableCoverage`, `confirmedCoverage?`, `rootCause?`
- `resolvedAt?`, `closedAt?`, `createdBy`, `version`

`version` suporta controle otimista. Número é único por tenant.

### SupportInteraction

- `id`, `supportCaseId`, `kind`, `visibility`
- `body`, `authorId`, `occurredAt`
- `attachmentIds[]`, `contactId?`, `channelReference?`

Visibilidade separa notas internas de mensagens compartilháveis com o cliente.

### ServicePolicyVersion

- `id`, `name`, `version`, `validFrom`, `validTo?`
- `businessCalendarId`, metas de primeira resposta/início/resolução
- regras de pausa, cortesias, escalonamento e cobertura

O chamado mantém snapshot da versão usada.

### ServicePriceTableVersion

- `id`, `name`, `version`, `validFrom`, `validTo?`
- serviços, zona de deslocamento, valor mínimo, impostos e adicionais

### ServiceVisitQuote

- `id`, `supportCaseId`, `priceTableVersionId`, `status`
- itens, deslocamento, desconto, impostos, total e moeda
- `validUntil`, `acceptedAt?`, `acceptedBy?`, `acceptanceEvidence?`
- `workOrderId?`, `receivableId?`

### WarrantyCoverage

- `id`, `projectId`, `equipmentId?`, `kind`
- `providerType`, `providerId?`, `startsAt`, `endsAt?`
- `termsSnapshot`, exclusões, documento e status

### WarrantyClaim

- `id`, `supportCaseId`, `coverageId`, `supplierId?`
- `status`, `protocol?`, `openedAt`, `decisionAt?`
- `failureDescription`, evidências, peças enviadas/recebidas
- `rmaCode?`, custos recuperáveis e reembolsados

### MonitoringSystem

- `id`, `projectId`, `provider`, `externalPlantId?`
- `connectionType`, `status`, `lastTelemetryAt?`
- `inverterEquipmentId?`, `secretReference?`

`secretReference` aponta para cofre externo; credenciais não ficam no banco de
domínio nem em logs.

### MonitoringReading

- `id`, `monitoringSystemId`, `period`, `metric`, `value`, `unit`
- `source`, `confidence?`, `capturedAt`, `importBatchId?`
- `revision`, `supersedesId?`, `validatedBy?`

Chave lógica: sistema, período, métrica e revisão vigente.

### ConnectivityIncident

- `id`, `monitoringSystemId`, `supportCaseId?`
- `detectedAt`, `restoredAt?`, `detectionSource`
- `reason?`, `customerNetworkChanged?`, `resolutionMethod?`

### PerformanceAlert

- `id`, `projectId`, `period`, `ruleVersionId`
- esperado, realizado, índice, disponibilidade dos dados
- `status`, `openedAt`, `acknowledgedAt?`, `supportCaseId?`

## Enumerações essenciais

- `SupportCoverage`: `PENDENTE`, `CONTRATO`, `INSTALACAO`, `FABRICANTE`,
  `CORTESIA`, `SEGURO`, `COBRAVEL`, `NAO_APLICAVEL`.
- `ReadingSource`: `INFORMADA`, `IMPORTADA`, `ESTIMADA`, `VALIDADA`.
- `MonitoringStatus`: `ATIVO`, `SEM_TELEMETRIA`, `PARCIAL`, `DESATIVADO`.
- `WarrantyClaimStatus`: `RASCUNHO`, `ENVIADA`, `EM_ANALISE`, `APROVADA`,
  `NEGADA`, `RMA`, `SUBSTITUIDA`, `ENCERRADA`.

## Restrições

- Todas as entidades carregam `tenantId` direta ou indiretamente e são filtradas
  no servidor.
- Exclusão é lógica onde houver exigência de retenção; registros financeiros,
  movimentos e auditoria não são apagados.
- Valores monetários usam decimal e moeda; energia usa decimal e unidade explícita.
- Anexos guardam metadados e chave S3, nunca URL pública permanente.
- Séries instaladas e substituídas referenciam o cadastro central da SPEC-009.
- Uma ordem ou cobrança é referenciada, não replicada.
- Atualizações concorrentes validam `version` e retornam conflito recuperável.

## Índices recomendados

- chamados por tenant/status/prioridade/prazo/responsável;
- chamados por cliente/projeto/equipamento;
- leitura por sistema/período/métrica/revisão;
- incidentes abertos por sistema;
- garantias vigentes por projeto/equipamento;
- alertas abertos por projeto e severidade.
