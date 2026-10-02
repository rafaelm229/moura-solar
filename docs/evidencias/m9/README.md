# Evidências do M9 — Pós-Venda, Suporte, Garantias, Monitoramento e Desempenho (SPEC-011)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                         | Resultado                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                        | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) 100% aprovados                               |
| Unitários API                       | Validações de SLA, abertura de chamados, fluxo de garantia (RMA), telemetria e cálculo de PR                             |
| `tests/after-sales.integration.mjs` | 8 cenários HTTP/PostgreSQL cobrindo garantias, telemetria (Princípio 1), incidentes, chamados, RMA, visita técnica e NPS |
| `pnpm test:migrations`              | Upgrade sequencial M0 a M9 preserva integridade; reaplicação idempotente aprovada                                        |
| Princípio 1 de Telemetria           | Ausência de dados não é tratada como geração zero; detecção de falha de comunicação vs subgeração real                   |
| Gestão de Garantias e RMA           | Controle de prazos de garantia (instalação e fabricante) e processo de troca/reparo com fornecedores                     |
| Chamados de Suporte com SLA         | Triagem de chamados (SLA de resposta e resolução), categorização e encerramento com pesquisa de satisfação (NPS)         |
| Visita Técnica e Integração M6/M8   | Orçamento de visita técnica não coberta por garantia com geração automática de OS no M8 e título a receber no M6         |

## Jornadas e Cenários Validados

1. **Ativação e Registro de Coberturas de Garantia:**
   - Registro automático ou manual de garantias de serviço/instalação (Moura Solar) e garantias de fábrica de módulos e inversores.
   - Prazos diferenciados com alertas de vencimento próximo.

2. **Telemetria e Monitoramento de Usinas:**
   - Integração com dados de telemetria dos inversores.
   - Aferição de Performance Ratio (PR) e confronto entre geração esperada vs. real.
   - Aplicação do Princípio 1: ausência de telemetria registra status de indisponibilidade de comunicação sem corromper a média histórica de rendimento.

3. **Incidentes de Conectividade:**
   - Registro de perdas de sinal, diagnóstico remoto e registro de restauração de telemetria com histórico para a equipe.

4. **Ciclo de Vida de Chamados de Suporte:**
   - Abertura de chamado pelo cliente ou suporte com prioridade e SLA associado.
   - Triagem, orientações remotas registradas e acompanhamento de tempo de atendimento.

5. **Processo de RMA (Garantia com Fornecedor):**
   - Abertura de chamado de RMA para equipamento defeituoso identificado.
   - Rastreamento de remessa ao fabricante, laudo técnico, substituição de peça e baixa no estoque.

6. **Visita Técnica Paga com Integração Ponta a Ponta:**
   - Geração de orçamento para serviços fora da garantia.
   - Aprovação do cliente gerando atomicamente título a receber no Financeiro (M6) e Ordem de Serviço na Engenharia (M8).
   - Encerramento do chamado com registro de nota de satisfação (NPS).
