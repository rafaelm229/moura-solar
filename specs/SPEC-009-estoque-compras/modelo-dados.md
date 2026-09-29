# Modelo de dados de estoque e compras

**Status:** Modelo conceitual

## 1. StockLocation

Local hierárquico com tipo, código, nome, endereço/vínculo, responsável e status.
Veículos e equipes podem referenciar entidades operacionais próprias.

## 2. StockPosition

Posição interna opcional de um local: corredor, prateleira, área, compartimento.

## 3. StockMovement

Razão imutável:

| Campo                       | Regra                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| id                          | UUID                                                                           |
| catalogItemId               | obrigatório                                                                    |
| type                        | RECEIVE/TRANSFER_OUT/TRANSFER_IN/CONSUME/RETURN/ADJUST/LOSS/QUARANTINE/RELEASE |
| quantity                    | positiva; sentido deriva do tipo                                               |
| unitCost                    | quando aplicável                                                               |
| fromLocationId/toLocationId | conforme movimento                                                             |
| projectId                   | opcional/obrigatório em consumo de projeto                                     |
| lotId/serialId              | conforme rastreabilidade                                                       |
| sourceEntity                | compra, instalação, inventário etc.                                            |
| occurredAt                  | instante efetivo                                                               |
| status                      | PENDING/CONFIRMED/REVERSED                                                     |
| reversalOfId                | correção                                                                       |
| idempotencyKey              | operações repetíveis                                                           |

## 4. StockBalance

Projeção/cache por item, local, lote e eventualmente posição. Pode ser reconstruída
dos movimentos. Atualizada transacionalmente para consultas e bloqueios eficientes.

## 5. StockReservation e ReservationItem

Reserva vinculada a projeto e versão da lista técnica. Item contém produto,
local, quantidade solicitada/reservada/separada/consumida/liberada e versão.

## 6. PickingList

Lista de separação com reserva, local, responsável, status e itens conferidos.

## 7. StockTransfer

Cabeçalho de transferência e itens. Estados:

```text
DRAFT → DISPATCHED → PARTIALLY_RECEIVED/RECEIVED
                 ↘ CANCELED conforme estágio
```

## 8. InventoryLot

Código, item, fornecedor, compra, fabricação/validade quando aplicável, custo e
estado. Quantidade é derivada por local.

## 9. SerializedAsset

Serial único, item, lote opcional, estado, localização/custódia, projeto instalado,
datas de garantia e histórico.

## 10. InventoryCount

Sessão, local, instante-base, escopo, status e contagens. Ajustes são movimentos
gerados após aprovação, nunca edição do saldo.

## 11. Supplier

Cadastro próprio, sem reutilizar Customer. Possui identidade, contatos, endereço,
condições, categorias e status.

## 12. PurchaseRequest

Necessidade de compra com origem, projeto opcional, solicitante, prioridade,
justificativa, itens e aprovação.

## 13. PurchaseOrder e PurchaseOrderItem

Pedido ao fornecedor com condições, moeda, itens, custo, quantidades pedidas e
recebidas, prazos e status.

## 14. GoodsReceipt

Recebimento parcial/total do pedido, documentos, conferente, divergências, lotes,
seriais e movimentos de entrada gerados.

## 15. StockIssue e WarrantyCase

Ocorrência de defeito/perda/avaria e processo de garantia. Mantêm fotos, evidências,
decisões, movimentações e custos relacionados.

## 16. Restrições

- Saldo disponível não pode ficar negativo, salvo política excepcional explícita.
- Serial só pode possuir uma custódia/estado atual.
- Movimento confirmado não é apagado.
- Reserva e saldo são atualizados na mesma transação.
- Transferência não duplica quantidade em origem e destino.
- Recebimento parcial não encerra pedido prematuramente.
- Ajuste de inventário exige contagem e aprovação rastreáveis.
