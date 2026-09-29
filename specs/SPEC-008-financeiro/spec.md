# SPEC-008 — Financeiro, parcelas, recebimentos, custos e fluxo de caixa

**Status:** Proposta para validação financeira  
**Versão:** 0.1.0  
**Dependências:** SPEC-001, SPEC-002, SPEC-005, SPEC-006 e SPEC-007

## 1. Objetivo

Transformar condições comerciais aprovadas em compromissos financeiros
rastreáveis, acompanhando valores previstos e realizados por projeto, sem usar o
status financeiro como campo manual desconectado de parcelas e movimentos.

## 2. Princípios

1. Condição de pagamento, parcela, recebimento e movimento de caixa são entidades
   diferentes.
2. Parcela não fica “paga” por checkbox; fica liquidada por alocação de recebimento.
3. Valores previstos não são confundidos com valores realizados.
4. Correções usam estorno/ajuste auditado; não apagam movimentos confirmados.
5. O gate financeiro é calculado por política e evidências reais.
6. Valores monetários usam decimal e moeda explícita.
7. Indicadores são derivados do razão operacional, não contadores editáveis.
8. Boletos e gateways ficam fora desta etapa, mas o modelo permitirá integração.

## 3. Escopo

### Incluído

- condição de pagamento da proposta/contrato;
- entrada e parcelas;
- contas a receber;
- recebimentos parciais, totais e antecipados;
- alocação de recebimento;
- vencimento e inadimplência;
- renegociação;
- descontos, juros, multa e acréscimos registrados;
- contas a pagar e custos adicionais;
- custo previsto versus realizado;
- comissões;
- categorias, centros de custo e contas financeiras;
- fluxo de caixa previsto e realizado;
- margem e resultado por projeto;
- anexos/comprovantes;
- gates financeiros e alertas;
- exportação de relatórios.

### Fora do escopo

- emissão de boleto;
- PIX dinâmico/gateway;
- conciliação bancária automática;
- emissão fiscal;
- contabilidade oficial;
- escrituração tributária;
- folha de pagamento;
- gestão bancária completa.

O módulo é gerencial/operacional e não substitui sistema contábil ou obrigação fiscal.

## 4. Condição de pagamento

É criada a partir da proposta aceita e confirmada no contrato. Contém:

- valor contratado;
- moeda;
- entrada;
- quantidade de parcelas;
- datas ou regras de vencimento;
- valor de cada parcela;
- método esperado;
- marcos vinculados quando aplicável;
- tolerância de arredondamento;
- política de juros/multa/desconto aprovada;
- condição mínima para liberar cada gate.

Alterar a condição após aceite exige renegociação/aditivo ou aprovação formal; não
reescreve parcelas históricas.

## 5. Contas a receber

### Estados da parcela

```text
DRAFT
OPEN
PARTIALLY_PAID
PAID
OVERDUE
RENEGOTIATED
CANCELED
WRITTEN_OFF
```

- `OPEN`: emitida internamente e aguardando recebimento.
- `PARTIALLY_PAID`: possui recebimento alocado menor que o saldo.
- `PAID`: saldo liquidado dentro da tolerância.
- `OVERDUE`: vencida com saldo positivo.
- `RENEGOTIATED`: substituída por nova condição preservando vínculo.
- `WRITTEN_OFF`: baixa por decisão autorizada, diferente de pagamento.

Job diário atualiza inadimplência de forma idempotente. A situação também pode ser
calculada em consulta para evitar dependência exclusiva do job.

## 6. Recebimentos

Registrar recebimento exige:

- projeto/cliente;
- data efetiva;
- valor e moeda;
- método;
- conta financeira;
- origem/referência;
- comprovante quando política exigir;
- responsável.

Um recebimento pode liquidar uma ou mais parcelas. Uma parcela pode receber várias
alocações. Valor não alocado permanece identificado como crédito/pendência, nunca
é descartado silenciosamente.

## 7. Alocação

Política inicial sugerida:

- usuário seleciona parcelas ou aceita sugestão da mais antiga;
- sistema apresenta principal, acréscimo, desconto e saldo;
- soma das alocações não pode superar o recebimento sem criar crédito explícito;
- concorrência é controlada para impedir dupla liquidação;
- confirmação é transacional;
- estorno cria movimento inverso e reabre saldos afetados.

## 8. Renegociação

- preserva condição e parcelas originais;
- registra saldo negociado, motivo, aprovador e nova condição;
- parcelas substituídas ficam `RENEGOTIATED`;
- recebimentos anteriores permanecem intactos;
- diferença concedida aparece como desconto/perda aprovada;
- gates são reavaliados.

## 9. Contas a pagar e custos realizados

Categorias iniciais:

- materiais;
- fornecedores;
- mão de obra;
- comissão;
- frete/deslocamento;
- engenharia/ART/homologação;
- locação;
- serviço terceirizado;
- adequação civil/elétrica;
- impostos/taxas registrados;
- garantia/retrabalho;
- outros com justificativa.

Uma obrigação pode estar vinculada a projeto, fornecedor, compra, instalação ou
centro de custo. Pagamento confirmado gera saída realizada.

### Estados

```text
DRAFT
OPEN
PARTIALLY_PAID
PAID
OVERDUE
CANCELED
```

## 10. Custo previsto versus realizado

- Previsto vem da versão de preço aceita e do orçamento operacional aprovado.
- Comprometido inclui compras/obrigações aprovadas ainda não pagas.
- Realizado inclui consumo de estoque conforme política de custo e despesas
  efetivamente reconhecidas.
- Pago é movimento de caixa e pode ocorrer em data diferente do custo realizado.

A plataforma deve mostrar as quatro visões sem misturá-las.

## 11. Comissões

### Política configurável

Pode considerar:

- percentual sobre preço final;
- percentual sobre margem;
- valor fixo;
- faixas/meta;
- papel do participante;
- gatilho de aquisição (`CONTRACT_ACTIVE`, `PAYMENT_RECEIVED`, `PROJECT_DELIVERED`);
- gatilho de pagamento;
- estorno/cancelamento.

### Ciclo

```text
ESTIMATED → EARNED → APPROVED → PAYABLE → PAID
                  ↘ CANCELED/REVERSED
```

Comissão estimada aparece na proposta internamente; somente torna-se adquirida
quando o gatilho configurado ocorre. Mudança de política não altera comissões já
congeladas para projetos anteriores.

## 12. Gate financeiro

O gate não é checkbox. Uma política avalia fatos, por exemplo:

- entrada mínima totalmente recebida;
- percentual recebido sobre valor contratado;
- ausência de parcela vencida crítica;
- financiamento aprovado;
- exceção formal autorizada.

O resultado registra:

- política e versão;
- valores usados;
- parcelas/recebimentos considerados;
- instante do cálculo;
- motivo de bloqueio ou satisfação.

Recebimento, estorno, renegociação ou vencimento solicita nova avaliação.

## 13. Fluxo de caixa

Visões:

- entradas previstas;
- entradas realizadas;
- saídas previstas;
- saídas comprometidas;
- saídas realizadas;
- saldo por conta;
- projeção diária/semanal/mensal;
- por projeto, categoria e centro de custo.

Transferência entre contas gera dois movimentos vinculados e não receita/despesa.

## 14. Inadimplência e cobrança

- parcelas vencidas são identificadas automaticamente;
- faixas sugeridas: 1–7, 8–15, 16–30 e acima de 30 dias, configuráveis;
- atividade de cobrança pode ser gerada para responsável;
- promessa de pagamento registra data, valor e observação;
- promessa não liquida parcela;
- contato e resultado entram na timeline;
- automação de WhatsApp permanece fora desta fase.

## 15. Correções e fechamento

- Não apagar recebimento/pagamento confirmado.
- Estorno exige motivo e permissão.
- Períodos financeiros podem ser fechados.
- Alteração retroativa em período fechado exige reabertura autorizada ou ajuste no
  período atual conforme política.
- Toda mudança relevante é auditada.

## 16. Telas

- painel financeiro;
- contas a receber;
- detalhe da parcela;
- registro/alocação de recebimento;
- inadimplência e cobranças;
- contas a pagar;
- registro de pagamento;
- custos do projeto: previsto/comprometido/realizado/pago;
- comissões;
- fluxo de caixa;
- contas financeiras, categorias e centros de custo;
- relatórios e exportações;
- gates e exceções.

## 17. Responsividade

- No celular, títulos e parcelas usam cartões com saldo, vencimento e ação.
- Registro de recebimento/pagamento funciona em uma coluna.
- Valores digitados usam teclado numérico adequado.
- Resumos fixos reservam espaço e não encobrem campos.
- Tabelas densas e conciliações mantêm versão otimizada no desktop, mas operações
  autorizadas permanecem disponíveis no celular.
- Confirmações financeiras mostram valor, conta, data e projeto em destaque.

## 18. Permissões

```text
finance:read
finance:view_project_summary
receivables:read
receivables:create
receivables:update_draft
receipts:create
receipts:allocate
receipts:reverse
receivables:renegotiate
receivables:write_off
payables:read
payables:create
payments:create
payments:reverse
cashflow:read
cashflow:manage_accounts
commissions:read_own
commissions:read_all
commissions:configure
commissions:approve
commissions:pay
financial_gates:waive
financial_periods:close
financial_periods:reopen
```

## 19. Eventos

- `PaymentPlanCreated`
- `ReceivableIssued`
- `ReceivableOverdue`
- `ReceiptRecorded`
- `ReceiptAllocated`
- `ReceiptReversed`
- `PaymentPlanRenegotiated`
- `PayableCreated`
- `PaymentRecorded`
- `PaymentReversed`
- `CommissionEarned`
- `CommissionApproved`
- `CommissionPaid`
- `FinancialGateSatisfied`
- `FinancialGateBlocked`

## 20. Casos de aceitação

```gherkin
Cenário: pagamento parcial não liquida parcela
  Dado que uma parcela aberta possui saldo de R$ 10.000
  Quando for alocado um recebimento de R$ 4.000
  Então a parcela deve ficar parcialmente paga
  E o saldo deve ser R$ 6.000
  E o gate deve ser reavaliado conforme política
```

```gherkin
Cenário: estorno reabre saldo
  Dado que uma parcela foi liquidada por um recebimento
  Quando um usuário autorizado estornar esse recebimento
  Então deve ser criado movimento inverso
  E a parcela deve voltar ao estado derivado do saldo e vencimento
  E o movimento original deve permanecer auditável
```

```gherkin
Cenário: entrada recebida libera gate
  Dado que a política exige entrada mínima totalmente recebida
  E o contrato está válido
  Quando o recebimento da entrada for confirmado e alocado
  Então o gate financeiro deve ficar satisfeito
  E o projeto deve reavaliar as próximas liberações
```

```gherkin
Cenário: comissão não é paga apenas pela venda
  Dado que a política adquire comissão após recebimento da entrada
  Quando a proposta for aceita mas a entrada não tiver sido recebida
  Então a comissão deve continuar estimada
  E não deve entrar como comissão a pagar
```

## 21. Critérios de aprovação

- [ ] Condições e gates financeiros definidos.
- [ ] Estados de parcelas e movimentos aprovados.
- [ ] Política de recebimento parcial e estorno aprovada.
- [ ] Categorias e centros de custo definidos.
- [ ] Políticas de comissão validadas.
- [ ] Conceitos previsto/comprometido/realizado/pago aprovados.
- [ ] Política de fechamento definida.
- [ ] Fluxos responsivos validados.
