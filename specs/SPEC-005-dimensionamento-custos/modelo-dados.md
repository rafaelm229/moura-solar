# Modelo técnico e comercial inicial

**Status:** Modelo conceitual

## 1. Entidades principais

### EnergyReading

| Campo            | Regra                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| utilityUnitId    | UC obrigatória                                                             |
| referenceMonth   | primeiro dia do mês de referência                                          |
| consumptionKwh   | decimal não negativo                                                       |
| injectedKwh      | decimal opcional                                                           |
| billedAmount     | decimal monetário opcional                                                 |
| source           | BILL/MANUAL/IMPORT                                                         |
| documentId       | conta de energia opcional                                                  |
| version          | sequencial por UC/mês; versões anteriores permanecem consultáveis          |
| correctionReason | obrigatório em correção explicitamente versionada                          |
| status           | ACTIVE/SUPERSEDED/DELETED; no máximo uma ACTIVE por UC/mês                 |
| expectedVersion  | obrigatória para corrigir a versão ativa e impedir sobrescrita concorrente |

### Survey

| Campo                   | Regra                                |
| ----------------------- | ------------------------------------ |
| opportunityId           | obrigatório                          |
| utilityUnitId           | obrigatório para conclusão           |
| type                    | REMOTE/ONSITE/HYBRID                 |
| status                  | DRAFT/IN_PROGRESS/COMPLETED/REOPENED |
| tariffPerKwh            | decimal e moeda                      |
| connectionType/voltage  | controlados                          |
| roof/site data          | estrutura versionável                |
| assumptions             | texto/estrutura auditável            |
| completedBy/completedAt | preenchidos na conclusão             |
| version                 | concorrência                         |

### Design

É o agrupador lógico do dimensionamento da oportunidade.

### DesignVersion

| Campo                         | Regra                               |
| ----------------------------- | ----------------------------------- |
| designId                      | obrigatório                         |
| versionNumber                 | sequencial dentro do design         |
| basedOnVersionId              | origem opcional                     |
| templateVersionId             | template aplicado opcional          |
| status                        | DRAFT/IN_REVIEW/APPROVED/SUPERSEDED |
| systemType                    | ON_GRID/OFF_GRID/HYBRID             |
| targetMonthlyGenerationKwh    | decimal                             |
| dcPowerKwp                    | decimal calculado/validado          |
| acPowerKw                     | decimal calculado/validado          |
| estimatedMonthlyGenerationKwh | decimal                             |
| estimatedAnnualGenerationKwh  | decimal                             |
| calculationVersion            | identificador do algoritmo          |
| assumptionsSnapshot           | JSON estruturado/versionado         |
| approvedBy/approvedAt         | somente aprovada                    |
| createdAt                     | UTC                                 |

### ProjectTemplate e ProjectTemplateVersion

O primeiro identifica o modelo; o segundo congela premissas, itens e serviços.
Somente versões publicadas podem originar dimensionamentos comerciais.

### CatalogItem

| Campo               | Regra                        |
| ------------------- | ---------------------------- |
| sku                 | único por organização        |
| kind                | MATERIAL/SERVICE             |
| categoryId          | controlado                   |
| name                | obrigatório                  |
| manufacturer/model  | opcionais conforme tipo      |
| unitOfMeasure       | UN/M/M2/KG/HOUR/SERVICE etc. |
| technicalAttributes | estrutura por categoria      |
| referenceCost       | decimal monetário atual      |
| trackingMode        | NONE/LOT/SERIAL              |
| status              | ACTIVE/INACTIVE              |
| version             | concorrência                 |

### DesignItem

| Campo           | Regra                                |
| --------------- | ------------------------------------ |
| designVersionId | obrigatório                          |
| catalogItemId   | referência opcional para item manual |
| kind/category   | snapshot                             |
| description     | snapshot                             |
| unitOfMeasure   | snapshot                             |
| quantity        | decimal positivo                     |
| unitCost        | snapshot monetário                   |
| totalCost       | calculado no backend                 |
| costSource      | CATALOG/QUOTE/MANUAL/AVERAGE_COST    |
| optional        | booleano                             |
| justification   | exigida para manual/exceção          |

### AdditionalCost

Registra categoria, descrição, quantidade/base, valor, tratamento comercial e
justificativa.

### PricingVersion

| Campo                     | Regra                                      |
| ------------------------- | ------------------------------------------ |
| designVersionId           | base técnica imutável                      |
| directMaterialCost        | soma derivada                              |
| directServiceCost         | soma derivada                              |
| additionalCost            | soma derivada                              |
| contingencyAmount         | decimal                                    |
| totalEstimatedCost        | calculado                                  |
| markupPercent             | decimal                                    |
| priceBeforeDiscount       | calculado                                  |
| discountAmount/Percent    | calculado/validado                         |
| finalPrice                | calculado                                  |
| grossMarginAmount/Percent | calculado                                  |
| status                    | DRAFT/PENDING_APPROVAL/APPROVED/SUPERSEDED |
| approval metadata         | usuário, instante e motivo                 |

## 2. Separação do estoque

`CatalogItem` identifica o que pode ser usado. `DesignItem` prevê o que será usado.
Nenhum deles representa saldo. Saldo, reserva e movimentos pertencem ao módulo de
estoque e serão relacionados posteriormente pelo `catalogItemId`.

## 3. Snapshots obrigatórios

Versões aprovadas congelam:

- descrição e especificação comercial dos itens;
- quantidades;
- custos unitários e origem;
- premissas técnicas;
- cálculo de geração;
- custos adicionais;
- política e resultado do preço;
- responsáveis e aprovações.

## 4. Restrições

- Dinheiro usa tipo decimal com moeda explícita quando necessário.
- kWh, kW e kWp possuem campos separados.
- Quantidade de módulos é inteira positiva.
- Potência DC deve corresponder à soma dos módulos dentro da tolerância definida.
- Versão aprovada não aceita `PATCH` de conteúdo.
- Inativar item de catálogo não remove seu histórico.
- Apenas uma versão aprovada vigente por design, salvo política explícita de
  coexistência.
