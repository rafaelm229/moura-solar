# Contrato inicial da API comercial

**Status:** Esboço para orientar OpenAPI; não é implementação final

## 1. Convenções

- Prefixo: `/api/v1`.
- JSON em camelCase.
- IDs opacos.
- Datas/instantes em ISO 8601.
- Paginação por cursor para atividades/timelines extensas; paginação convencional
  pode ser usada em tabelas administrativas quando justificada.
- Mutação envia `expectedVersion` quando atualizar entidade concorrente.
- Criações críticas aceitam `Idempotency-Key`.

## 2. Clientes

```text
GET    /customers
POST   /customers
GET    /customers/:customerId
PATCH  /customers/:customerId
POST   /customers/:customerId/archive
POST   /customers/:customerId/restore
GET    /customers/duplicates
```

Sub-recursos:

```text
POST   /customers/:customerId/contacts
PATCH  /customers/:customerId/contacts/:contactId
DELETE /customers/:customerId/contacts/:contactId
POST   /customers/:customerId/addresses
PATCH  /customers/:customerId/addresses/:addressId
GET    /customers/:customerId/timeline
```

`DELETE` em contato remove/arquiva o subregistro permitido; não significa exclusão
física do cliente ou de dados já usados em documento.

## 3. Unidades consumidoras

```text
GET    /customers/:customerId/utility-units
POST   /customers/:customerId/utility-units
GET    /utility-units/:utilityUnitId
PATCH  /utility-units/:utilityUnitId
POST   /utility-units/:utilityUnitId/deactivate
POST   /utility-units/:utilityUnitId/reactivate
```

## 4. Oportunidades

```text
GET    /opportunities
POST   /opportunities
GET    /opportunities/:opportunityId
PATCH  /opportunities/:opportunityId
GET    /opportunities/:opportunityId/timeline
```

Comandos explícitos:

```text
POST /opportunities/:opportunityId/qualify
POST /opportunities/:opportunityId/start-survey
POST /opportunities/:opportunityId/lose
POST /opportunities/:opportunityId/reopen
POST /opportunities/:opportunityId/archive
POST /opportunities/:opportunityId/utility-unit
```

`POST /opportunities/:opportunityId/utility-unit` cria uma UC para o cliente da
oportunidade e a vincula na mesma transação. Envia `expectedVersion` e
`Idempotency-Key`; a API exige `consumer_units:manage` e
`opportunities:update` no contexto da oportunidade. Conflito de versão ou
qualquer falha reverte a criação da UC. Repetir a mesma chave e payload retorna
o resultado original; reutilizar a chave com payload diferente retorna 409.

Não existirá `PATCH { state: ... }` para movimentar a esteira.

## 5. Atividades

```text
GET    /activities
POST   /activities
GET    /activities/:activityId
PATCH  /activities/:activityId
POST   /activities/:activityId/complete
POST   /activities/:activityId/reschedule
POST   /activities/:activityId/cancel
```

Filtros iniciais:

```text
assigneeId
teamId
status
type
dueFrom
dueTo
overdue
customerId
opportunityId
```

## 6. Exemplo de criação de oportunidade

```json
{
  "customerId": "cus_...",
  "utilityUnitId": "ucu_...",
  "title": "Sistema residencial — unidade principal",
  "sourceId": "src_...",
  "ownerUserId": "usr_...",
  "projectType": "ON_GRID",
  "needSummary": "Reduzir consumo médio aproximado de 1.000 kWh/mês",
  "estimatedConsumption": "1000.00",
  "expectedCloseDate": "2026-10-15",
  "firstActivity": {
    "type": "CALL",
    "subject": "Confirmar envio da conta de energia",
    "dueAt": "2026-09-29T13:00:00Z"
  }
}
```

A oportunidade e a primeira atividade devem ser criadas na mesma transação.

## 7. Exemplo de qualificação

```json
POST /api/v1/opportunities/opp_123/qualify
{
  "expectedVersion": 3,
  "confirmedNeedSummary": "Sistema on-grid residencial",
  "estimatedConsumption": "1000.00",
  "nextActivityId": "act_456"
}
```

Possíveis respostas:

- `200`: transição realizada.
- `400`: dados inválidos.
- `403`: sem permissão.
- `409`: versão/estado mudou ou chave única conflitou.
- `422`: pré-condições de negócio não atendidas.

## 8. Códigos de erro iniciais

```text
CUSTOMER_TAX_ID_ALREADY_EXISTS
CUSTOMER_POSSIBLE_DUPLICATE
CUSTOMER_HAS_ACTIVE_OPPORTUNITIES
UTILITY_UNIT_ALREADY_EXISTS
OPPORTUNITY_INVALID_TRANSITION
OPPORTUNITY_QUALIFICATION_INCOMPLETE
OPPORTUNITY_LOSS_REASON_REQUIRED
ACTIVITY_RESULT_REQUIRED
ACTIVITY_ALREADY_CLOSED
CONCURRENT_MODIFICATION
IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
```

## 9. Permissões relacionadas

```text
customers:read
customers:create
customers:update
customers:archive
customers:override_duplicate
utility_units:read
utility_units:create
utility_units:update
consumer_units:manage
opportunities:read
opportunities:create
opportunities:update
opportunities:qualify
opportunities:lose
opportunities:reopen
activities:read
activities:create
activities:update
activities:complete
activities:manage_team
```

Cada permissão pode ser limitada aos escopos `own`, `team` ou `organization`.

## 10. Testes de contrato mínimos

- payload válido e inválido para cada mutação;
- 401 sem autenticação;
- 403 sem permissão;
- 404 sem exposição indevida;
- 409 por versão e unicidade;
- 422 por pré-condição;
- idempotência da criação;
- filtros respeitando escopo;
- OpenAPI compatível com o cliente TypeScript gerado.
