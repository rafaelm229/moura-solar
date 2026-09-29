# Cálculos, conciliação e indicadores financeiros

**Status:** Proposta para validação financeira

## 1. Saldo da parcela

```text
principalPaid = soma das alocações principais ativas
outstandingPrincipal = originalAmount - principalPaid - approvedWriteOff
```

Juros, multa e desconto são armazenados separadamente para não distorcer principal.

## 2. Estado derivado

```text
se canceled → CANCELED
se renegotiated → RENEGOTIATED
se outstanding <= tolerance → PAID
se paid > 0 e outstanding > tolerance → PARTIALLY_PAID ou OVERDUE conforme data
se dueDate < hoje e outstanding > tolerance → OVERDUE
senão → OPEN
```

## 3. Inadimplência

```text
daysOverdue = max(0, today - dueDate)
overdueAmount = soma dos saldos vencidos
```

Datas usam fuso e calendário de negócio definidos; horário UTC não deve antecipar
vencimento local.

## 4. Receita contratada, recebida e a receber

```text
contractedRevenue = valor vigente contratado
receivedRevenue = recebimentos confirmados alocados ao projeto
openReceivables = soma de saldos abertos
```

Receita contábil não será inferida sem política contábil; estes termos são de gestão.

## 5. Custos

```text
estimatedCost = custo congelado da proposta/projeto
committedCost = obrigações/compras aprovadas ainda não realizadas/pagas
recognizedCost = materiais consumidos + serviços/custos reconhecidos
paidCost = saídas de caixa alocadas aos custos do projeto
```

## 6. Resultado gerencial do projeto

```text
forecastGrossResult = contractedRevenue - forecastTotalCost
forecastMarginPercent = forecastGrossResult / contractedRevenue × 100

actualGrossResult = recognizedRevenueBasis - recognizedCost
actualMarginPercent = actualGrossResult / recognizedRevenueBasis × 100
```

`recognizedRevenueBasis` precisa ser configurada/denominada corretamente para não
ser confundida com reconhecimento contábil oficial. No MVP, apresentar preferencialmente:

```text
cashResult = receivedRevenue - paidCost
operationalResult = contractedRevenue - recognizedCost
```

com rótulos claros.

## 7. Desvio de custo

```text
costVarianceAmount = forecastTotalCost - recognizedCost
costVariancePercent = (recognizedCost - forecastTotalCost) / forecastTotalCost × 100
```

Percentual positivo indica estouro conforme a segunda fórmula; a interface deve
usar nomenclatura inequívoca.

## 8. Fluxo de caixa

Por período:

```text
netCashFlow = confirmedInflows - confirmedOutflows
projectedNetCashFlow = expectedInflows - expectedOutflows
closingBalance = openingBalance + netCashFlow
```

Transferências internas não entram no fluxo consolidado da empresa.

## 9. Comissão

Exemplo percentual sobre preço:

```text
estimatedCommission = commissionBase × commissionPercent / 100
```

Exemplo sobre margem:

```text
commissionBase = max(0, contractedRevenue - approvedCostBasis)
```

Base, gatilho e política devem estar congelados na instância da comissão.

## 10. Indicadores

### Recebíveis

- total a receber;
- vencendo hoje/7/30 dias;
- total vencido;
- aging da inadimplência;
- prazo médio de recebimento;
- recebimentos do período;
- promessas vencidas.

### Projetos

- receita contratada;
- valor recebido;
- saldo a receber;
- custo previsto;
- custo comprometido;
- custo realizado;
- custo pago;
- resultado e margem previstos;
- resultado operacional e caixa;
- desvio de custo.

### Comissões

- estimadas;
- adquiridas;
- aprovadas;
- a pagar;
- pagas;
- revertidas;
- por vendedor/período.

### Caixa

- saldo por conta;
- entradas/saídas realizadas;
- projeção 7/30/90 dias;
- concentração de recebimentos;
- compromissos futuros.

## 11. Guardrails

- Divisão por zero retorna indicador indisponível, não infinito.
- Valores negativos inesperados geram alerta.
- Toda métrica informa período, moeda e base.
- Dashboard não mistura previsto e realizado na mesma série sem legenda clara.
- Exportações respeitam permissão e registram auditoria quando contêm dados sensíveis.
