# Movimentos, saldos e custo médio

**Status:** Proposta para validação operacional e financeira

## 1. Fórmulas de saldo

Para item/local:

```text
physicalOnHand = entradas confirmadas - saídas físicas confirmadas
reserved = reservas ativas ainda não liberadas/consumidas
blocked = quarentena e bloqueios ainda fisicamente no local
available = physicalOnHand - reserved - blocked
```

`reserved` precisa considerar a fase da transferência/custódia para não subtrair o
mesmo material duas vezes. A implementação usará estados explícitos e testes por
cenário, não apenas uma soma genérica.

## 2. Tipos e efeito esperado

| Movimento             |                       Físico |                    Reserva | Custódia/custo                      |
| --------------------- | ---------------------------: | -------------------------: | ----------------------------------- |
| Recebimento           |              aumenta destino |                 não altera | atualiza custo conforme política    |
| Reserva               |                   não altera |                    aumenta | compromete projeto                  |
| Liberação             |                   não altera |                    diminui | remove compromisso                  |
| Transferência saída   |     reduz origem/em trânsito |           conforme vínculo | muda custódia                       |
| Transferência entrada |              aumenta destino |           conforme vínculo | confirma custódia                   |
| Consumo               |         reduz custódia/local |          reduz compromisso | reconhece custo do projeto          |
| Devolução             |              aumenta destino | não recria automaticamente | reverte/ajusta custo conforme regra |
| Quarentena            | físico total pode permanecer |           reduz disponível | bloqueia uso                        |
| Perda/descarte        |                 reduz físico |             libera vínculo | reconhece perda                     |
| Ajuste                |                aumenta/reduz |  não deve mascarar reserva | exige inventário/aprovação          |

## 3. Custo médio móvel

Política inicial proposta por item e organização/local conforme decisão financeira.

Na entrada comprada:

```text
newAverageCost =
  (previousQuantity × previousAverageCost + receivedQuantity × receivedUnitCost)
  / (previousQuantity + receivedQuantity)
```

Saídas consomem o custo médio vigente no instante do movimento e congelam esse custo
no movimento. Saída não recalcula a média das unidades remanescentes.

## 4. Casos especiais de custo

- Frete e despesas podem ser rateados se política aprovada definir base.
- Devolução ao fornecedor precisa reverter custo conforme lote/movimento original.
- Devolução de projeto retorna pelo custo congelado da saída/consumo relacionado.
- Ajuste positivo exige custo de entrada justificado.
- Estoque inicial possui custo e origem documentados.
- Custo médio negativo ou indefinido bloqueia movimento que exigiria valorização.

## 5. Custo do projeto

```text
materialRecognizedCost = soma(quantityConsumed × frozenMovementUnitCost)
```

Itens devolvidos corretamente reduzem/revertem o custo reconhecido conforme
movimento relacionado. Custo previsto permanece o snapshot da proposta, permitindo
comparação com realizado.

## 6. Reserva parcial e faltas

Exemplo:

```text
necessário: 25 módulos
disponível: 20 módulos
reservado: 20
faltante: 5
```

O projeto fica parcialmente reservado, gera necessidade de compra e não é marcado
como pronto para instalação até o gate aceitar a condição.

## 7. Transferência

No despacho:

- origem deixa de disponibilizar;
- quantidade entra em trânsito;
- destino ainda não confirma físico utilizável.

No recebimento:

- trânsito diminui;
- destino recebe físico;
- divergência gera pendência e investigação.

## 8. Concorrência

Operações que afetam disponível devem:

- bloquear/validar a linha de saldo apropriada na transação;
- confirmar versão/quantidade;
- gravar movimento e projeção atomicamente;
- usar idempotência;
- falhar claramente quando saldo mudou.

## 9. Reconstrução e auditoria

- A projeção de saldo deve ser reconstruível dos movimentos.
- Job de verificação compara projeção e razão.
- Diferença técnica gera alerta; não cria ajuste automático.
- Cada saldo oferece drill-down até movimentos, documentos e usuários.

## 10. Indicadores

- físico, reservado e disponível;
- valor do estoque;
- itens abaixo do mínimo;
- reservas incompletas;
- itens parados;
- perdas e avarias;
- divergências de inventário;
- giro;
- prazo médio de compra;
- desempenho de fornecedor;
- custo previsto versus consumido por projeto.
