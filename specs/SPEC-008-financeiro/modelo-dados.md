# Modelo de dados financeiro

**Status:** Modelo conceitual

## 1. PaymentPlan

Condição financeira vinculada ao projeto/contrato, com valor total, moeda, versão,
status, regra de entrada, parcelas e política do gate.

## 2. Receivable

| Campo                              | Regra                                       |
| ---------------------------------- | ------------------------------------------- |
| id                                 | UUID                                        |
| paymentPlanId/projectId/customerId | vínculos obrigatórios                       |
| installmentNumber                  | sequência na condição                       |
| originalAmount                     | valor principal                             |
| dueDate                            | vencimento                                  |
| status                             | estado derivado/persistido com consistência |
| outstandingAmount                  | derivado/controlado                         |
| version                            | concorrência                                |

## 3. Receipt

Representa entrada financeira confirmada ou pendente de confirmação, com data,
valor, método, conta financeira, referência, comprovante, status e responsável.

## 4. ReceiptAllocation

Entidade associativa entre recebimento e parcela. Separa:

- valor principal;
- juros/multa;
- desconto;
- outras diferenças.

Possui status ativo/estornado e vínculo com movimento de reversão.

## 5. Payable

Obrigação a pagar com fornecedor/beneficiário, projeto, categoria, centro de custo,
competência, vencimento, valor, saldo, documento e status.

## 6. Payment

Saída financeira confirmada, vinculada a uma conta e alocada a uma ou mais
obrigações por `PaymentAllocation`.

## 7. FinancialAccount

Caixa, conta bancária, carteira ou conta de controle. Armazena moeda e status, mas
saldo é derivado dos movimentos confirmados.

## 8. CashMovement

Razão operacional append-only:

| Campo              | Regra                                        |
| ------------------ | -------------------------------------------- |
| id                 | UUID                                         |
| accountId          | obrigatório                                  |
| direction          | IN/OUT                                       |
| type               | RECEIPT/PAYMENT/TRANSFER/REVERSAL/ADJUSTMENT |
| amount/currency    | decimal                                      |
| effectiveAt        | data efetiva                                 |
| sourceEntity       | origem rastreável                            |
| reversedMovementId | quando aplicável                             |
| status             | PENDING/CONFIRMED/REVERSED                   |

## 9. CostEntry

Registra custo do projeto por estágio:

```text
ESTIMATED
COMMITTED
RECOGNIZED
PAID
REVERSED
```

Pode derivar de item de projeto, compra, consumo de estoque, conta a pagar ou custo
manual autorizado. Evitar duplicar o mesmo custo entre fontes.

## 10. CommissionPolicy e Commission

Política versionada e instância congelada por projeto/participante. Armazena base,
percentual/valor, gatilhos, valor estimado, adquirido, pago e reversões.

## 11. FinancialGateEvaluation

Registra projeto, política/versão, resultado, dados usados, bloqueios, instante e
entidades de evidência.

## 12. PromiseToPay

Promessa vinculada ao cliente/parcela com data prevista, valor, responsável,
status e resultado. Não altera saldo.

## 13. ClosingPeriod

Período com status `OPEN/CLOSED/REOPENED`, responsável, instante e motivo. Impede
alterações retroativas comuns em movimentos dentro do período fechado.

## 14. Restrições

- Soma alocada ativa não supera valor do recebimento sem crédito explícito.
- Soma principal alocada não supera saldo da parcela.
- Movimento confirmado não é apagado.
- Estorno referencia movimento original e possui mesmo valor/sentido inverso.
- Transferência possui pernas IN/OUT vinculadas e mesmo valor/moeda.
- Apenas um gatilho efetivo adquire a mesma comissão.
- Jobs e webhooks futuros usam idempotência.
- Alterações simultâneas em saldo/alocação usam lock ou concorrência adequada.
