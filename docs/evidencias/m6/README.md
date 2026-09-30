# Evidências do M6 — Governança Financeira, Contas a Receber, Parcelas, Recebimentos, Contas a Pagar, Comissões, Margem e Fluxo de Caixa (SPEC-008)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                       | Resultado                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                      | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) 100% aprovados                          |
| Unitários API                     | 5 testes no motor financeiro, regras de parcelamento, alocação gulosa, estornos e margem (`financial.spec.ts`)      |
| `tests/financial.integration.mjs` | 6 cenários HTTP/PostgreSQL completos de planos, recebimentos, Gate FINANCIAL, estornos, pagamentos e fluxo de caixa |
| `pnpm test:migrations`            | Upgrade sequencial M0 → M1 → M2 → M3 → M4 → M5 → M6 preserva integridade; reaplicação idempotente aprovada          |
| `pnpm test:integration`           | 43 cenários de testes de integração ponta a ponta em todos os módulos (M1 a M6) 100% aprovados                      |
| Gate Financeiro Dinâmico          | Liberação formal apenas após quitação integral da entrada; estorno reverte estado imediatamente para pendente       |
| Alocação Imutável de Recebíveis   | Alocação explícita ou automática com controle de saldo remanescente, juros e descontos                              |
| Contas a Pagar & Comissões        | Comissões vinculadas a gatilhos operacionais (`FINANCIAL`), gerando obrigações de pagamento auditadas               |
| Fluxo de Caixa Consolidado        | Ledger de movimentações financeiras (IN / OUT) por conta bancária, com conciliação em tempo real                    |
| Interface & Responsividade        | Dashboard global e aba de oportunidade com KPIs, gráficos de margem realizada/projetada e Action Hub responsivo     |

## Jornadas e Cenários Validados

1. **Geração Automática do Plano de Pagamento (SPEC-008):**
   - Criação integrada na superação do **Gate C** contratual ou via endpoint dedicado `POST /opportunities/:id/payment-plan/generate`.
   - Suporte a entrada/sinal diferenciada e desmembramento do saldo em parcelas com vencimentos calculados e arredondamento centesimal exato.
   - Inicialização do `ProjectGate` (tipo `FINANCIAL`) no estado `PENDING`.
   - Estimativa automática de comissão comercial vinculada à liquidação do Gate Financeiro.

2. **Registro de Recebimentos e Alocação:**
   - Suporte a múltiplos métodos de liquidação (PIX, TED, Boleto, Cartão de Crédito, Liberação de Financiamento).
   - Alocação direcionada por parcela (`allocations`) ou alocação automática/gulosa das parcelas mais antigas para as mais novas.
   - Atualização atômica do saldo devedor (`outstandingAmount`), valor liquidado (`paidAmount`) e status (`OPEN`, `PARTIALLY_PAID`, `PAID`).
   - Registro de movimentação financeira `IN` na conta bancária correspondente.

3. **Governança do Gate Financeiro (Gate FINANCIAL):**
   - Avaliação rigorosa da quitação da parcela 1 (Entrada / Sinal).
   - Pagamentos parciais mantêm o Gate no estado `PENDING`.
   - Quitação integral transiciona automaticamente o Gate para `SATISFIED`, gerando evidência auditada e liberando a aquisição de comissões (`ACQUIRED`) com respectivo título a pagar.

4. **Estorno Auditado com Reversão de Cascata:**
   - Endpoint `POST /receipts/:id/reverse` com justificativa obrigatória.
   - Reversão imutável da movimentação financeira através de contrapartida `OUT` (tipo `REVERSAL`).
   - Reabertura e recálculo dos saldos dos recebíveis afetados.
   - Reavaliação automática do Gate Financeiro, revertendo para `PENDING` caso o sinal deixe de estar integralmente quitado.

5. **Contas a Pagar, Pagamentos e Custeio:**
   - Cadastro de obrigações com categorização contábil (`EQUIPMENT`, `INSTALLATION_LABOR`, `COMMISSION`, `ENGINEERING_HOMOLOGATION`, `FREIGHT`, `OTHER`).
   - Liquidação de pagamentos com movimentação `OUT` no fluxo de caixa.
   - Acompanhamento de custos realizados vs. orçados na oportunidade.

6. **Indicadores de Margem e Fluxo de Caixa Global:**
   - Cálculo dinâmico de Margem Bruta Realizada (`receivedRevenue - paidCost`) e Margem Projetada (`contractedRevenue - recognizedCost`).
   - Dashboard consolidado com entradas, saídas, saldo operacional líquido e extrato detalhado de movimentações bancárias.
