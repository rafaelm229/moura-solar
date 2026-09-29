# SPEC-011 — Pós-venda, suporte e desempenho

## Status

Proposta para revisão.

## Objetivo

Fechar o ciclo do cliente após a entrega, reunindo chamados, garantias,
manutenções, visitas cobradas, conectividade do monitoramento e acompanhamento
de geração. O módulo deve preservar o histórico do projeto e integrar campo,
estoque e financeiro sem duplicar seus dados.

## Escopo

- Chamados vinculados ao cliente, projeto, instalação e equipamentos.
- Triagem remota, interações, anexos, prioridade, responsável e SLA.
- Incidentes de conectividade, inclusive troca de nome ou senha do Wi-Fi.
- Visita técnica gratuita, em garantia ou cobrada, sempre classificada.
- Garantias da instalação e dos fabricantes, solicitações e RMA.
- Manutenção corretiva e preventiva.
- Ocorrências climáticas, danos, perdas e evidências.
- Leituras mensais de geração e consumo, manuais ou integradas.
- Comparação entre geração esperada e realizada e alertas de desempenho.
- Pesquisa de satisfação ao encerrar atendimento.

Ficam fora desta versão: atendimento automático por WhatsApp, assinatura
eletrônica de terceiros, controle remoto de inversores e garantia automática de
produção energética.

## Princípios de domínio

1. Ausência de telemetria não significa geração zero.
2. Todo atendimento possui uma classificação e uma causa confirmada ou pendente.
3. A cobrança nunca nasce somente da quantidade de desconexões; depende da
   política contratada, diagnóstico, deslocamento e aceite do cliente.
4. Defeito de produto, falha de instalação, evento externo e mau uso são causas
   distintas e não podem ser presumidas antes da inspeção.
5. Valores, SLA e condições aplicáveis são versionados e congelados no chamado.
6. Senhas de Wi-Fi ou aplicativos não são armazenadas em texto aberto.
7. Ordens de serviço, movimentos de estoque e lançamentos financeiros continuam
   pertencendo aos módulos que são suas fontes de verdade.

## Tipos de atendimento

| Tipo                   | Exemplo                                      | Resultado esperado                  |
| ---------------------- | -------------------------------------------- | ----------------------------------- |
| Orientação             | Dúvida sobre o aplicativo                    | Resolução remota documentada        |
| Conectividade          | Inversor sem telemetria após troca do Wi-Fi  | Reconexão remota ou visita aprovada |
| Garantia de instalação | Falha comprovada de execução                 | Ordem sem cobrança ao cliente       |
| Garantia de fabricante | Inversor ou módulo com defeito coberto       | Solicitação, RMA e substituição     |
| Manutenção             | Limpeza, inspeção ou ajuste fora de garantia | Orçamento e ordem de serviço        |
| Evento externo         | Vento, granizo, queda de objeto ou terceiro  | Laudo, orçamento e possível seguro  |
| Desempenho             | Geração abaixo do esperado                   | Investigação com dados e contexto   |

## Estados do chamado

`NOVO`, `EM_TRIAGEM`, `AGUARDANDO_CLIENTE`, `AGUARDANDO_INTERNO`, `AGENDADO`,
`EM_ATENDIMENTO`, `RESOLVIDO`, `ENCERRADO`, `CANCELADO` e `REABERTO`.

- `RESOLVIDO` exige solução, causa, responsável e evidência quando aplicável.
- `ENCERRADO` ocorre após confirmação do cliente ou prazo configurável sem
  contestação.
- Um chamado encerrado não é alterado: uma recorrência o reabre ou cria outro
  chamado relacionado, conforme a política.
- Toda transição gera evento de domínio e auditoria.

## Fluxo principal

1. Registrar o chamado por cliente, projeto ou equipamento.
2. Classificar impacto, urgência, cobertura provável e canal de entrada.
3. Executar triagem remota e registrar orientações e evidências.
4. Confirmar causa e cobertura, quando possível.
5. Se precisar de campo, criar orçamento de visita ou ordem coberta.
6. Obter aceite quando houver cobrança.
7. Agendar e executar pela operação de campo da SPEC-010.
8. Baixar ou devolver materiais pela SPEC-009.
9. Gerar contas a receber/pagar e custo realizado pela SPEC-008.
10. Validar a solução, comunicar o cliente e encerrar.

## Reconexão de monitoramento

Quando o cliente alterar SSID, senha, roteador ou provedor:

1. O atendente confirma se há somente perda de telemetria ou também indício de
   interrupção da geração.
2. O sistema oferece roteiro remoto específico para fabricante/modelo.
3. Se não for resolvido remotamente, calcula uma visita pela tabela vigente,
   considerando serviço, região, deslocamento e impostos.
4. O cliente recebe e aceita o orçamento antes do agendamento, salvo emergência
   ou cobertura contratual registrada.
5. A visita gera ordem de serviço, evidências e lançamento financeiro.

A empresa pode oferecer uma primeira orientação remota sem custo, mas quantidade
de cortesias e regras de visita devem ser configuráveis por contrato/política.
Não haverá valor fixo codificado no sistema.

## Danos por vento e outros eventos

- Registrar data, local, fotos, vídeos, relato e condições observadas.
- Bloquear classificação definitiva antes de inspeção quando não houver prova.
- Permitir laudo e causa: instalação, produto, estrutura preexistente, evento
  climático, terceiro, uso indevido ou inconclusiva.
- Consultar cobertura de garantia, fabricante, seguradora e contrato.
- Em substituição, reservar material, rastrear número de série, registrar custo e
  preservar o componente removido para análise/RMA.

## SLA

- SLA é definido por prioridade, tipo de cliente, contrato e calendário útil.
- Há metas separadas de primeira resposta, início do atendimento e resolução.
- Pausas só ocorrem em estados e motivos configurados, como espera do cliente.
- Alterações de política não recalculam silenciosamente chamados já abertos.
- Alertas e escalonamentos são eventos; o painel apenas os projeta.

## Permissões mínimas

| Ação                     | Administrador |         Gerente |  Suporte | Instalador |  Financeiro |          Vendedor |
| ------------------------ | ------------: | --------------: | -------: | ---------: | ----------: | ----------------: |
| Ver chamados autorizados |           Sim |             Sim |      Sim | Atribuídos | Financeiros | Clientes próprios |
| Classificar cobertura    |           Sim |             Sim |      Sim |        Não |         Não |               Não |
| Aprovar cortesia         |           Sim | Conforme limite |      Não |        Não |         Não |               Não |
| Executar visita          |           Sim |             Sim |      Sim |        Sim |         Não |               Não |
| Emitir cobrança          |           Sim | Conforme limite | Solicita |        Não |         Sim |               Não |
| Encerrar garantia/RMA    |           Sim |             Sim |      Sim |  Evidência |         Não |               Não |

As permissões reais seguem a SPEC-002 e devem considerar unidade, equipe e
propriedade do cliente.

## Integrações internas

- SPEC-004: cliente, contatos e histórico comercial.
- SPEC-005: geração estimada e premissas congeladas.
- SPEC-007: cobertura e cláusula contratual aplicável.
- SPEC-008: cobrança, reembolso, custo e margem pós-venda.
- SPEC-009: reserva, consumo, devolução, garantia e número de série.
- SPEC-010: agenda, ordem, checklist, fotos e assinatura de campo.

## Eventos principais

- `SupportCaseOpened`
- `SupportCaseClassified`
- `RemoteGuidanceRecorded`
- `ServiceVisitQuoted`
- `ServiceVisitAccepted`
- `SupportCaseScheduled`
- `WarrantyClaimOpened`
- `EquipmentReplaced`
- `MonitoringConnectivityLost`
- `MonitoringConnectivityRestored`
- `PerformanceAlertRaised`
- `SupportCaseResolved`
- `SupportCaseClosed`

Consumidores devem ser idempotentes e usar outbox transacional conforme
SPEC-000.

## Experiência web responsiva

- No celular: abertura rápida, câmera, linha do tempo, botão de contato e ações
  de campo ao alcance de uma mão.
- No tablet: checklist, evidências e dados do equipamento lado a lado quando
  houver espaço.
- No desktop: fila de triagem, filtros, SLA, gráficos e comparação histórica.
- Nenhuma função é ocultada somente pelo tamanho da tela; apresentação e
  densidade mudam, permissões não.

## Critérios de aceite

1. Dois usuários veem o mesmo chamado e suas mudanças após atualização da API.
2. É impossível tratar falta de dados como geração igual a zero.
3. Uma visita cobrada exige política/tabela, valor congelado e aceite auditável.
4. Uma visita em garantia registra cobertura e não gera conta ao cliente.
5. Uma troca de equipamento atualiza ordem, série, estoque e custo sem duplicar
   movimentações em reprocessamento.
6. Evento climático permanece sem causa definitiva até inspeção autorizada.
7. Leituras preservam origem, competência, unidade, revisão e responsável.
8. Usuário sem permissão não consulta anexos ou chamados fora do seu escopo.
9. O layout é utilizável em 360 px, tablet e desktop sem conteúdo encoberto.
10. Toda mudança relevante aparece na auditoria com autor, data e motivo.
