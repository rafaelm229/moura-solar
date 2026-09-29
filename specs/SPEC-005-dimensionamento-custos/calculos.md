# Regras de cálculo e unidades

**Status:** Estrutura proposta; parâmetros técnicos exigem aprovação do responsável técnico

## 1. Princípios

1. Cálculos oficiais acontecem no backend.
2. Entradas, unidades, fórmula, arredondamento e versão são persistidos.
3. Resultados estimados são identificados como estimativas.
4. Parâmetros técnicos são configurados por região/cenário, não números globais
   ocultos no código.
5. A plataforma apoia o dimensionamento; não substitui validação de engenharia.

## 2. Consumo

Para `n` meses válidos:

```text
averageMonthlyConsumptionKwh = sum(consumptionKwh) / n
annualizedConsumptionKwh = averageMonthlyConsumptionKwh × 12
```

O sistema mostra `n`. Se `n < 12`, exibe alerta de histórico incompleto.

Consumo projetado:

```text
targetConsumptionKwh = historicalAverageKwh + plannedAdditionalLoadKwh
```

As duas parcelas permanecem visíveis.

## 3. Potência dos módulos

```text
dcPowerKwp = moduleQuantity × modulePowerWp / 1000
```

Exemplo técnico de unidade, não recomendação de projeto:

```text
25 módulos × 630 Wp = 15.750 Wp = 15,75 kWp
```

## 4. Geração estimada

A implementação deverá suportar ao menos dois métodos:

### Método simplificado configurável

```text
estimatedMonthlyGenerationKwh = dcPowerKwp × monthlySpecificYield
```

`monthlySpecificYield` é expresso em kWh/kWp/mês e deve indicar fonte, local,
vigência e responsável pela premissa.

### Método externo/futuro

Resultado importado de software ou serviço técnico, registrando fornecedor,
versão, entradas e documento de evidência.

O sistema não embute uma produtividade fixa para todo projeto.

### Fonte geográfica brasileira

O mecanismo deverá aceitar coordenadas ou município e consultar/importar dados de
irradiação de fonte versionada. A fonte inicial recomendada é a base do Atlas
Brasileiro de Energia Solar disponibilizada pelo LABREN/INPE e utilizada pelo
SunData/CRESESB como apoio ao dimensionamento.

Para cada consulta, persistir:

```text
sourceName
sourceVersion
sourceReferenceDate
latitude
longitude
irradiationPlane
monthlyValues
retrievedAt
```

Se a consulta externa estiver indisponível, o sistema pode usar o último conjunto
versionado disponível, identificando-o claramente, ou exigir entrada manual. Nunca
deve substituir silenciosamente a fonte por um valor genérico.

### Estimativa preliminar de potência

Quando houver produtividade específica mensal válida:

```text
suggestedDcPowerKwp = targetMonthlyGenerationKwh / monthlySpecificYield
```

O resultado é sugestão e deve ser ajustado por perdas, área, sombreamento,
orientação, inclinação, limites elétricos e estratégia comercial/técnica.

## 5. Cobertura de consumo

```text
coveragePercent = estimatedMonthlyGenerationKwh / targetConsumptionKwh × 100
```

Cobertura acima de 100% exige aviso e justificativa técnica/comercial, pois pode
ser intencional ou indicar erro de unidade/premissa.

## 6. Energia compensável e economia

A economia não será calculada apenas como geração × tarifa sem considerar regras
aplicáveis. A primeira versão deve registrar:

- tarifa informada e sua fonte;
- parcela compensável adotada;
- custo mínimo/disponibilidade assumido;
- impostos/bandeiras considerados ou excluídos;
- degradação e reajuste, se usados em projeção longa;
- período e versão da hipótese.

Modelo preliminar simples, quando autorizado:

```text
monthlyGrossSavings = compensableEnergyKwh × compensableTariffPerKwh
monthlyNetSavings = monthlyGrossSavings - remainingMonthlyCharges
```

O PDF deve apresentar premissas e não prometer economia garantida.

## 7. Custos

Por item:

```text
itemTotal = quantity × unitCost
```

Totais:

```text
directMaterialCost = sum(material item totals)
directServiceCost = sum(service item totals)
additionalCost = sum(additional costs)
baseCost = directMaterialCost + directServiceCost + additionalCost
totalEstimatedCost = baseCost + contingencyAmount
```

## 8. Markup e margem

Markup sobre custo:

```text
priceBeforeDiscount = totalEstimatedCost × (1 + markupPercent / 100)
```

Preço final:

```text
finalPrice = priceBeforeDiscount - discountAmount
```

Margem bruta sobre preço:

```text
grossMarginAmount = finalPrice - totalEstimatedCost
grossMarginPercent = grossMarginAmount / finalPrice × 100
```

Exemplo: adicionar 100% sobre um custo de R$ 10.000 produz preço de R$ 20.000 e
margem bruta de 50%, não lucro/margem de 100%.

## 9. Arredondamento

- Valores internos mantêm precisão decimal definida por campo.
- Moeda é apresentada com duas casas, mas somas usam valores persistidos com
  precisão apropriada.
- Percentuais não são arredondados antes do cálculo final.
- Regras de arredondamento são centralizadas e testadas.

## 10. Validações de consistência

- `moduleQuantity > 0` quando sistema usa módulos.
- potência unitária em Wp e total em kWp.
- potência do inversor em kW, nunca inferida do texto do produto.
- geração mensal em kWh/mês.
- tarifa em moeda/kWh.
- custo e preço com moeda definida.
- finalPrice maior que zero.
- margem abaixo da alçada bloqueia aprovação direta.
- alteração de qualquer entrada invalida hash/resultado anterior.
- sugestão de inversor respeita limites elétricos cadastrados e exige validação de
  strings/MPPT antes da aprovação técnica;
- estimativa preliminar não pode ser rotulada como projeto executivo;
- economia projetada exibe faixa/cenário quando houver incerteza relevante.

## 11. Versionamento do cálculo

Cada resultado registra:

```text
calculationVersion
calculatedAt
calculatedBy
inputSnapshot
parameterSource
resultSnapshot
```

Isso permite reproduzir por que uma proposta antiga apresentou determinada
geração, custo e economia.
