# Evidências do M10 — Automações, Notificações, Gestão, Painel de Atenção e Indicadores (SPEC-012)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                          | Resultado                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                         | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) 100% aprovados                         |
| Unitários API                        | Testes de motor de regras, deduplicação de alertas, resolução justificada, idempotência e cálculo de metas         |
| `tests/automations.integration.mjs`  | 8 cenários HTTP/PostgreSQL cobrindo Central de Atenção, motor de regras versionadas, notificações, metas e KPIs    |
| `pnpm test:migrations`               | Upgrade sequencial M0 a M10 preserva integridade; reaplicação idempotente aprovada                                 |
| Central de Atenção (Critério 9)      | Deduplicação inteligente de alertas (oportunidades estagnadas, gates pendentes, estoque crítico, SLA estourado)    |
| Resolução Justificada & Reabertura   | Resolução de alertas com justificativa obrigatória e reabertura automática se a condição de risco persistir        |
| Motor de Regras (Critérios 1 e 2)    | Regras versionadas com gatilhos de eventos, condições configuráveis, ações idempotentes e histórico de execução    |
| Gestão de Metas & KPIs (Princípio 3) | Acompanhamento de metas comerciais e operacionais versionadas com cálculo de progresso e projeções baseadas no CRM |
| Interface White & Green Limpa        | Telas em conformidade estrita com o design system claro institucional (verde `#087443`, fundo `#f8fafc`/branco)    |

## Jornadas e Cenários Validados

1. **Central de Atenção & Deduplicação de Alertas:**
   - Varredura de inconsistências e riscos operacionais da esteira inteira (M1–M9).
   - Deduplicação: itens repetidos da mesma entidade/motivo não poluem a caixa de entrada.
   - Níveis de severidade: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

2. **Resolução Auditada e Proteção contra Falso Positivo:**
   - Fechamento de alerta com justificativa auditável.
   - Reabertura automática caso o evento de risco volte a ocorrer na próxima varredura.

3. **Motor de Automações Configurável:**
   - Criação e ativação de regras com disparadores (`STAGE_CHANGED`, `PAYMENT_RECEIVED`, `WARRANTY_EXPIRING`, `SLA_BREACHED`).
   - Avaliação de condições (ex.: valor > 50k, dias parado > 5).
   - Execução idempotente de ações (notificação, webhook, alteração de status) garantindo que nenhum gatilho dispare em duplicidade.

4. **Central de Notificações Multicanal:**
   - Notificações in-app com contador de não lidas e marcação em lote.
   - Preferências por usuário (habilitar/desabilitar categorias de alerta).

5. **Gestão de Metas & Indicadores Executivos:**
   - Metas de faturamento, potência instalada (kWp) e tickets de pós-venda.
   - Cálculo dinâmico de atingimento com base na fonte única de verdade no PostgreSQL.
   - Painel de observabilidade executiva unindo a jornada completa do cliente.
