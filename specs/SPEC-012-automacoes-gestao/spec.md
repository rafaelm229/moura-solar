# SPEC-012 — Automações, notificações, gestão e observabilidade

## Status

Proposta para revisão.

## Objetivo

Transformar os eventos operacionais das SPECs anteriores em tarefas, alertas,
notificações e indicadores confiáveis, sem criar uma segunda fonte de verdade.
Esta especificação também define como a operação será monitorada tecnicamente e
como falhas serão diagnosticadas.

## Escopo

- Motor de regras versionadas e automações orientadas a eventos.
- Central de notificações dentro do sistema.
- E-mail transacional e integrações externas futuras.
- Tarefas, lembretes, escalonamentos e filas de atenção.
- Indicadores comerciais, operacionais, financeiros e de pós-venda.
- Metas por período, equipe, unidade e responsável.
- Auditoria funcional e trilha de execução das automações.
- Logs estruturados, métricas técnicas, rastreamento e alertas de infraestrutura.
- Reprocessamento seguro, fila de falhas e prevenção de duplicidade.

Ficam fora desta versão: disparo por WhatsApp, IA tomando decisões sem aprovação,
data warehouse separado, cobrança automática sem regra financeira aprovada e
alteração automática de contratos ou preços vigentes.

## Princípios

1. Estado de negócio nasce nos módulos de domínio; automações apenas reagem.
2. Painéis são projeções calculadas, nunca campos atualizados manualmente.
3. Toda regra possui versão, vigência, autor e histórico.
4. Toda execução é idempotente, rastreável e recuperável.
5. Falha de notificação não desfaz a transação que originou o evento.
6. Usuário recebe somente conteúdo autorizado pelo seu escopo.
7. Alertas devem ser acionáveis, agrupados e silenciáveis com motivo.
8. Horário, fuso e calendário útil são explícitos.

## Arquitetura de execução

1. O módulo grava a mudança e um evento na outbox na mesma transação.
2. Um publicador entrega o evento à fila.
3. O motor seleciona regras vigentes compatíveis.
4. Cada ação recebe uma chave de idempotência.
5. A execução cria tarefa, alerta, notificação ou projeção.
6. Sucesso, tentativa, duração e erro ficam registrados.
7. Falhas transitórias usam retentativa com atraso; falhas definitivas vão para
   análise e reprocessamento controlado.

Não haverá chamada síncrona em cascata entre todos os módulos para manter a
esteira atualizada.

## Catálogo inicial de automações

| Gatilho                        | Condição                             | Ação                                              |
| ------------------------------ | ------------------------------------ | ------------------------------------------------- |
| Oportunidade sem atividade     | Prazo comercial vencido              | Criar tarefa e alertar vendedor                   |
| Proposta próxima do vencimento | Sem aceite ou recusa                 | Lembrar responsável                               |
| Proposta aceita                | Gates comercial/técnico válidos      | Solicitar contrato e atualizar projeção           |
| Contrato assinado              | Condições atendidas                  | Liberar gates financeiro e operacional aplicáveis |
| Parcela vencida                | Sem baixa ou acordo                  | Alertar financeiro e escalar por faixa            |
| Estoque abaixo do mínimo       | Saldo disponível abaixo da regra     | Criar alerta de reposição                         |
| Reserva insuficiente           | Projeto aprovado sem saldo           | Bloquear liberação e sugerir compra/transferência |
| Instalação próxima             | Checklist incompleto                 | Alertar equipe e coordenador                      |
| Projeto parado                 | Sem evento dentro do prazo do estado | Criar alerta e tarefa de desbloqueio              |
| Telemetria ausente             | Janela mínima excedida               | Abrir alerta de conectividade, não de geração     |
| SLA de suporte em risco        | Percentual do prazo consumido        | Avisar responsável e escalonar                    |

## Central de atenção

A central unifica pendências que exigem ação humana:

- tarefas atribuídas e não atribuídas;
- alertas por severidade;
- aprovações pendentes;
- falhas de automação que exigem intervenção;
- itens vencidos ou próximos do vencimento.

Cada item informa origem, motivo, prazo, responsável, contexto autorizado e ação
principal. Marcar como lido não resolve a pendência. Resolver exige a ação de
domínio ou um descarte justificado.

## Notificações

Canais iniciais:

- central interna;
- e-mail transacional;
- push futuro no aplicativo móvel.

WhatsApp permanece adiado. Preferências podem reduzir avisos informativos, mas
não comunicações obrigatórias de segurança, conformidade ou responsabilidade do
cargo. Templates são versionados, revisáveis e não podem expor dados sensíveis
em assunto, push ou tela bloqueada.

## Indicadores oficiais

| Área       | Indicadores iniciais                                               |
| ---------- | ------------------------------------------------------------------ |
| Comercial  | oportunidades, conversão por etapa/origem/vendedor, ciclo e perdas |
| Propostas  | emitidas, aceitas, vencidas, ticket e desconto                     |
| Financeiro | recebido, a receber, vencido, fluxo, margem prevista e realizada   |
| Estoque    | físico, reservado, disponível, cobertura, ruptura e giro           |
| Compras    | prazo médio, atraso, variação de custo e fornecedor                |
| Engenharia | tempo de levantamento, projeto e homologação                       |
| Instalação | agenda, produtividade, retrabalho, atraso e custo realizado        |
| Pós-venda  | volume, SLA, reincidência, garantia e satisfação                   |

Cada indicador deve apontar para sua definição, filtros, competência, fórmula,
fonte e instante da última atualização.

## Metas

- Metas possuem indicador, período, valor, unidade, escopo e responsável.
- Uma meta não reescreve resultados passados quando for editada; cria versão.
- Comparações respeitam competência e fuso da empresa.
- Ranking só aparece a perfis autorizados e nunca substitui a análise de contexto.

## Observabilidade técnica

- Logs JSON com `traceId`, `requestId`, tenant, usuário quando aplicável e código
  de erro; sem senhas, tokens ou documentos pessoais.
- Métricas de API, banco, filas, armazenamento, geração de documentos e jobs.
- Rastreamento distribuído entre API, worker e serviços externos.
- Health checks separados para disponibilidade e prontidão.
- Alertas para taxa de erro, latência, fila acumulada, falha de backup, pouco
  espaço, integração indisponível e automação presa.
- Ambientes de desenvolvimento, homologação e produção isolados.

## Auditoria

A auditoria registra quem, quando, onde e por que uma ação relevante ocorreu,
incluindo valores anteriores e posteriores permitidos. Execuções automáticas
usam uma identidade de sistema e preservam evento, regra e versão responsáveis.

Consultas de auditoria também são autorizadas e registradas. Dados secretos não
são copiados para a trilha.

## Segurança e LGPD

- Menor privilégio para painéis, exportações e notificações.
- Links externos temporários e arquivos protegidos.
- Retenção configurada por categoria e obrigação.
- Exportações grandes são assíncronas, auditadas e expiram.
- Preferências e consentimentos não anulam bases legais ou obrigações contratuais.
- Métricas técnicas usam identificadores minimizados sempre que possível.

## Resiliência

- Retentativa exponencial apenas para falhas classificadas como transitórias.
- Circuit breaker para integrações instáveis.
- Dead-letter queue com motivo, payload protegido e ferramenta de reprocessamento.
- Jobs longos registram progresso e podem ser retomados com segurança.
- Backups e restauração são testados; backup não testado não conta como garantia.
- Uma automação desativada não perde eventos: a política define ignorar,
  reprocessar desde a vigência ou executar manualmente.

## Permissões

- Administrador: configura regras técnicas e acessos globais.
- Gerente: configura regras e metas dentro do limite delegado.
- Responsáveis de área: veem indicadores e pendências do próprio escopo.
- Operadores: executam tarefas e recebem notificações autorizadas.
- Auditor: consulta trilhas sem permissão de alterar o domínio.

Configuração de regra, aprovação de ação financeira, acesso a auditoria e
reprocessamento são permissões distintas.

## Experiência responsiva

- Celular: central de atenção, tarefas, aprovações e alertas em cartões.
- Tablet: operação diária e comparação de indicadores com filtros compactos.
- Desktop: dashboards densos, construtor de regras autorizado e investigação.
- Gráficos sempre possuem alternativa textual, unidade, período e fonte.
- Nenhum gráfico depende de largura fixa ou passa por cima da navegação.

## Critérios de aceite

1. Reentregar o mesmo evento não duplica tarefa, cobrança ou notificação.
2. Alterar uma regra preserva a versão aplicada às execuções anteriores.
3. Falha de e-mail não reverte a mudança de negócio originadora.
4. Painel comercial muda quando os eventos reais da oportunidade mudam.
5. Indicador exibe fórmula, competência, filtros e atualização.
6. Um usuário não recebe conteúdo fora do seu escopo por nenhum canal.
7. Evento com erro pode ser identificado e reprocessado sem edição manual do banco.
8. Dados sensíveis não aparecem em logs ou mensagens resumidas.
9. Alertas repetidos são agrupados e mantêm contagem e histórico.
10. Central e dashboards funcionam em 360 px, tablet e desktop.
