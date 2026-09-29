# Modelo de dados comercial inicial

**Status:** Modelo conceitual; nomes físicos podem mudar na implementação

## 1. Entidades

### Customer

| Campo               | Tipo conceitual            | Regra                                  |
| ------------------- | -------------------------- | -------------------------------------- |
| id                  | UUID                       | imutável                               |
| organizationId      | UUID                       | obrigatório                            |
| kind                | PERSON/COMPANY             | obrigatório                            |
| legalName           | texto                      | nome/razão social                      |
| tradeName           | texto opcional             | nome fantasia                          |
| taxId               | texto normalizado opcional | único por organização quando informado |
| stateRegistration   | texto opcional             | pessoa jurídica                        |
| notes               | texto opcional             | acesso controlado                      |
| status              | ACTIVE/ARCHIVED            | não usar exclusão física comum         |
| version             | inteiro                    | concorrência otimista                  |
| createdAt/updatedAt | instante                   | UTC                                    |
| archivedAt          | instante opcional          | auditoria funcional                    |

### CustomerContact

| Campo               | Tipo conceitual            | Regra                           |
| ------------------- | -------------------------- | ------------------------------- |
| id                  | UUID                       | imutável                        |
| customerId          | UUID                       | obrigatório                     |
| type                | PHONE/EMAIL/WHATSAPP/OTHER | controlado                      |
| value               | texto                      | apresentação                    |
| normalizedValue     | texto                      | comparação/busca                |
| label               | texto opcional             | comercial, pessoal etc.         |
| isPrimary           | booleano                   | no máximo um principal por tipo |
| contactAllowed      | booleano/indefinido        | política futura                 |
| createdAt/updatedAt | instante                   | UTC                             |

### Address

| Campo               | Tipo conceitual  | Regra               |
| ------------------- | ---------------- | ------------------- |
| id                  | UUID             | imutável            |
| customerId          | UUID opcional    | endereço cadastral  |
| postalCode          | texto            | normalizado         |
| street/number       | texto            | número pode ser SN  |
| complement/district | texto opcional   | —                   |
| city/state/country  | texto/controlado | Brasil inicialmente |
| latitude/longitude  | decimal opcional | não usar float      |
| isPrimary           | booleano         | por cliente         |
| createdAt/updatedAt | instante         | UTC                 |

### UtilityUnit

| Campo               | Tipo conceitual   | Regra                  |
| ------------------- | ----------------- | ---------------------- |
| id                  | UUID              | imutável               |
| organizationId      | UUID              | obrigatório            |
| customerId          | UUID              | obrigatório            |
| addressId           | UUID              | local de instalação    |
| distributorId       | UUID              | concessionária         |
| externalCode        | texto opcional    | código da UC           |
| consumerClass       | enum/cadastro     | controlado             |
| tariffMode          | enum/cadastro     | controlado             |
| connectionType      | MONO/BI/TRI/OTHER | controlado             |
| voltage             | texto/controlado  | não presumir pelo tipo |
| status              | ACTIVE/INACTIVE   | histórico preservado   |
| version             | inteiro           | concorrência           |
| createdAt/updatedAt | instante          | UTC                    |

Índice único parcial recomendado: organização + concessionária + código da UC,
quando o código estiver preenchido e a unidade não tiver sido tecnicamente mesclada.

### Opportunity

| Campo                | Tipo conceitual               | Regra                                |
| -------------------- | ----------------------------- | ------------------------------------ |
| id                   | UUID                          | imutável                             |
| organizationId       | UUID                          | obrigatório                          |
| customerId           | UUID                          | obrigatório                          |
| utilityUnitId        | UUID opcional inicialmente    | exigível para avançar conforme fluxo |
| code                 | texto                         | identificador humano único           |
| title                | texto                         | descrição curta                      |
| ownerUserId          | UUID                          | responsável atual                    |
| sourceId             | UUID                          | origem controlada                    |
| projectType          | ON_GRID/OFF_GRID/HYBRID/OTHER | preliminar                           |
| needSummary          | texto                         | obrigatório para qualificar          |
| estimatedConsumption | decimal opcional              | kWh/mês                              |
| priority             | COLD/WARM/HOT ou controlado   | recomendação inicial                 |
| state                | enum da máquina               | alterado somente por comando         |
| expectedCloseDate    | data opcional                 | previsão comercial                   |
| lossReasonId         | UUID opcional                 | obrigatório se perdida               |
| lostAt               | instante opcional             | —                                    |
| version              | inteiro                       | concorrência                         |
| createdAt/updatedAt  | instante                      | UTC                                  |

### Activity

| Campo               | Tipo conceitual                       | Regra                             |
| ------------------- | ------------------------------------- | --------------------------------- |
| id                  | UUID                                  | imutável                          |
| organizationId      | UUID                                  | obrigatório                       |
| opportunityId       | UUID opcional                         | vínculo comercial                 |
| customerId          | UUID opcional                         | vínculo direto permitido          |
| type                | CALL/MESSAGE/MEETING/VISIT/EMAIL/TASK | controlado                        |
| subject             | texto                                 | obrigatório                       |
| description         | texto opcional                        | —                                 |
| assigneeUserId      | UUID                                  | responsável                       |
| dueAt               | instante                              | fuso apresentado localmente       |
| status              | OPEN/COMPLETED/CANCELED               | controlado                        |
| resultCode          | texto/controlado opcional             | obrigatório ao concluir           |
| resultNotes         | texto opcional                        | conforme resultado                |
| completedAt         | instante opcional                     | —                                 |
| previousActivityId  | UUID opcional                         | cadeia de reagendamento/follow-up |
| version             | inteiro                               | concorrência                      |
| createdAt/updatedAt | instante                              | UTC                               |

## 2. Relacionamentos

```text
Customer 1 ── N CustomerContact
Customer 1 ── N Address
Customer 1 ── N UtilityUnit
Customer 1 ── N Opportunity
UtilityUnit 1 ── N Opportunity
Opportunity 1 ── N Activity
Customer 1 ── N Activity
```

## 3. Histórico e auditoria

### DomainEvent/Outbox

Armazena eventos confirmados que precisam ser publicados após a transação.

### AuditEvent

Registra ator, ação, entidade, identificador, instante, traceId e metadados
permitidos. Não substitui histórico funcional apresentado ao usuário.

### OpportunityTransition

Registra estado anterior, próximo estado, comando, ator, instante, motivo e versão.
Permite calcular tempo em etapa sem campos derivados editáveis.

## 4. Restrições importantes

- `taxId` deve ser normalizado antes da validação de unicidade.
- Contato principal deve ser garantido por transação/índice adequado.
- Estado da oportunidade não possui endpoint genérico de edição.
- Arquivar cliente com oportunidade ativa deve ser bloqueado ou exigir resolução.
- Unidade consumidora usada por projeto não pode ser apagada.
- Dados exibidos em proposta serão snapshots próprios, não consultas retroativas ao
  cadastro atual do cliente.
