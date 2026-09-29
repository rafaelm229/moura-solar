# SPEC-010 — Engenharia, homologação, agenda, instalação e entrega

**Status:** Proposta para validação técnica e operacional  
**Versão:** 0.1.0  
**Dependências:** SPEC-001, SPEC-002, SPEC-003, SPEC-005, SPEC-007, SPEC-008 e SPEC-009

## 1. Objetivo

Coordenar a execução do projeto aprovado desde a liberação técnica até entrega e
pós-venda, conectando engenharia, concessionária, agenda, equipe, materiais,
checklists, evidências, comissionamento e aceite do cliente.

## 2. Princípios

1. Projeto comercial aprovado e projeto executivo são versões relacionadas, mas
   não a mesma entidade.
2. Instalação somente é agendada quando os gates aplicáveis estiverem atendidos ou
   dispensados formalmente.
3. Checklist é baseado no tipo/versão do projeto e gera evidência, não apenas caixas.
4. Material previsto, separado, utilizado e devolvido permanecem conciliáveis.
5. Fotos e seriais pertencem a etapas e itens identificados.
6. Concluir instalação física não encerra automaticamente homologação e projeto.
7. Todo fluxo essencial funciona na web responsiva para o instalador.
8. O aplicativo React Native futuro será cliente complementar da mesma API.

## 3. Escopo

### Incluído

- projeto operacional;
- projeto executivo versionado;
- arranjos, strings e MPPTs;
- orientação, inclinação e características do local;
- ART e documentos técnicos;
- fluxo de homologação;
- troca/liberação do medidor;
- gates de execução;
- equipes, habilidades e agenda;
- ordem de serviço;
- checklist de materiais, EPIs, ferramentas e execução;
- fotos antes, durante e depois;
- números de série instalados;
- materiais adicionais, consumidos e devolvidos;
- início, pausa, reagendamento e conclusão;
- comissionamento;
- assinatura/aceite do cliente;
- relatório de entrega;
- pendências e não conformidades.

### Fora do escopo

- cálculo estrutural automatizado;
- substituição de software técnico especializado;
- integração direta com todas as concessionárias;
- aplicativo React Native;
- manutenção preventiva avançada;
- telemetria em tempo real de inversores.

## 4. Projeto operacional

É criado quando a venda é confirmada e centraliza o contexto comum:

- cliente e UC;
- proposta e contrato;
- condição financeira;
- engenharia;
- materiais;
- instalação;
- entrega e pós-venda;
- gates e pendências.

Código único acompanha o projeto em todos os módulos.

## 5. Estados do projeto operacional

```text
PREPARATION
ENGINEERING
HOMOLOGATION
SUPPLY
READY_TO_SCHEDULE
SCHEDULED
INSTALLING
COMMISSIONING
DELIVERY
AFTER_SALES
CLOSED
SUSPENDED
CANCELED
```

Atividades paralelas são exibidas por gates e trilhas próprias; o estado principal
representa a fase predominante, não substitui o detalhe.

## 6. Gates para agenda

Política inicial:

- contrato atendido;
- condição financeira atendida;
- projeto técnico aprovado;
- exigência de homologação prévia atendida ou não aplicável;
- materiais essenciais reservados e separados;
- local/cliente confirmados;
- equipe habilitada disponível;
- impedimentos críticos resolvidos.

Dispensa exige motivo, aprovador, validade e risco registrado.

## 7. Agenda e equipes

### Equipe

- membros;
- líder;
- habilidades/certificações controladas;
- disponibilidade;
- veículo;
- ferramentas/EPIs sob custódia.

### Agendamento

- projeto e ordem de serviço;
- data/janela;
- duração prevista;
- equipe e líder;
- endereço;
- materiais;
- dependências;
- instruções de acesso;
- contato do cliente;
- confirmação do cliente.

Conflitos de equipe, veículo e horário são bloqueados ou exigem exceção autorizada.

## 8. Ordem de serviço

Estados:

```text
DRAFT
READY
ASSIGNED
CONFIRMED
IN_PROGRESS
PAUSED
PARTIALLY_COMPLETED
COMPLETED
CANCELED
```

Uma ordem pode ser reagendada preservando histórico. Instalação parcial registra o
que foi executado e gera ordem complementar sem fingir conclusão integral.

## 9. Preparação da equipe

Antes de sair:

- visualizar projeto e endereço;
- conferir lista técnica;
- confirmar materiais separados;
- conferir ferramentas e EPIs;
- registrar retirada/custódia;
- visualizar riscos e instruções;
- confirmar disponibilidade da equipe.

O checklist de equipamentos usa dados reais da separação, não uma lista digitada
novamente.

## 10. Execução em campo

Fluxo recomendado:

1. registrar deslocamento opcional/chegada;
2. confirmar local e responsável presente;
3. executar segurança inicial;
4. registrar fotos antes;
5. conferir condições versus levantamento;
6. iniciar execução;
7. registrar alterações e não conformidades;
8. capturar seriais;
9. registrar strings/MPPTs e configuração;
10. informar materiais adicionais/utilizados;
11. registrar fotos durante/depois;
12. executar testes;
13. conciliar materiais;
14. coletar aceite/assinatura;
15. enviar para conferência.

## 11. Pausa e bloqueios

Motivos iniciais:

- clima;
- ausência do cliente/acesso;
- risco de segurança;
- divergência técnica;
- material faltante/defeituoso;
- necessidade de adequação civil/elétrica;
- problema de concessionária;
- indisponibilidade da equipe;
- outro com justificativa.

Pausa exige descrição, evidências quando aplicável, ação corretiva, responsável e
previsão. Não pode concluir ordem com bloqueio crítico aberto.

## 12. Comissionamento

Checklist configurável conforme sistema/equipamentos, contendo:

- inspeção visual e fixação;
- proteções e aterramento;
- polaridade e conexões;
- medições exigidas pelo procedimento técnico;
- strings e MPPTs;
- configuração do inversor;
- comunicação/monitoramento;
- teste de operação;
- alarmes e observações;
- fotos/evidências;
- responsável técnico pela conferência.

Limites e procedimentos precisam ser aprovados pela engenharia e versionados.

## 13. Materiais e estoque

- Seriais instalados mudam para `INSTALLED` vinculados ao projeto.
- Consumo baixa a custódia e reconhece custo real.
- Material não utilizado retorna por transferência/devolução confirmada.
- Material adicional exige saldo, justificativa e permissão.
- Perda/avaria cria ocorrência e movimento apropriado.
- Conclusão operacional exige conciliação ou pendência formal aprovada.

## 14. Aceite do cliente

Na primeira versão web:

- nome do responsável presente;
- documento parcialmente protegido quando necessário;
- declaração/termo aprovado;
- assinatura por toque ou registro de recusa/indisponibilidade;
- data, usuário e projeto;
- cópia no relatório de entrega.

A assinatura em tela é evidência operacional; seu enquadramento jurídico deverá ser
validado antes do uso como substituto de assinatura contratual.

## 15. Conferência e entrega

Após a equipe concluir:

- supervisor/engenharia revisa checklists, fotos, seriais, materiais e testes;
- pode aprovar, rejeitar ou solicitar correção;
- pendências são classificadas como bloqueantes ou não bloqueantes;
- aprovação gera relatório de entrega;
- cliente pode receber cópia por download/envio registrado;
- projeto avança conforme homologação e demais pendências.

## 16. Relatório de entrega

Conteúdo mínimo:

- projeto, cliente e local;
- equipe e datas;
- solução instalada;
- equipamentos e seriais;
- resumo das strings/MPPTs;
- checklists e resultados;
- fotos selecionadas;
- materiais adicionais relevantes;
- pendências;
- orientações de uso e monitoramento;
- assinatura/aceite;
- responsável pela conferência;
- versão e hash.

## 17. Web móvel

- Página inicial mostra instalações de hoje e pendências.
- Checklist opera com uma mão e alvos de 48 px quando possível.
- Câmera abre diretamente para evidências.
- Progresso é salvo em rascunhos frequentes.
- Interface mostra claramente `salvo`, `enviando`, `erro` e `confirmado`.
- Falha de rede não simula conclusão.
- Fotos grandes usam upload resiliente e fila; conclusão informa pendências de upload.
- Barra inferior não cobre o último item.
- Todas as funções permanecem disponíveis em tablet/desktop.

Suporte offline completo será especificado para o aplicativo nativo. Na web, o MVP
prioriza recuperação de rascunho e upload resiliente, sem prometer operação offline
total antes de testes reais de campo.

## 18. Permissões

```text
engineering:read
engineering:create
engineering:update
engineering:review
engineering:approve
homologation:manage
art:manage
teams:manage
schedules:read
schedules:create
schedules:update
schedules:override_conflict
work_orders:read
work_orders:assign
work_orders:start
work_orders:pause
work_orders:complete
installations:upload_photos
installations:record_serials
installations:record_materials
installations:commission
installations:collect_acceptance
installations:review
installations:approve
delivery_reports:generate
```

## 19. Eventos

- `EngineeringStarted`
- `EngineeringApproved`
- `HomologationSubmitted`
- `HomologationApproved`
- `MeterExchangeRequested`
- `MeterExchangeCompleted`
- `ProjectReadyToSchedule`
- `InstallationScheduled`
- `MaterialsCheckedOut`
- `WorkOrderStarted`
- `WorkOrderPaused`
- `InstallationPartiallyCompleted`
- `InstallationCompleted`
- `CommissioningApproved`
- `CustomerAcceptanceRecorded`
- `InstallationReviewRejected`
- `DeliveryApproved`
- `DeliveryReportGenerated`

## 20. Casos de aceitação

```gherkin
Cenário: projeto bloqueado não pode ser agendado
  Dado que o gate de materiais não está atendido
  Quando um usuário comum tentar confirmar a instalação
  Então o sistema deve recusar o agendamento
  E listar o material/bloqueio pendente
```

```gherkin
Cenário: checklist deriva do projeto e estoque
  Dado que um projeto aprovado possui equipamentos separados
  Quando a ordem de serviço for liberada
  Então o checklist deve listar os itens efetivamente separados
  E seus lotes/seriais quando aplicável
  E não deve exigir recadastro manual da mesma lista
```

```gherkin
Cenário: fotos pendentes impedem conclusão confirmada
  Dado que fotos obrigatórias ainda estão com falha de upload
  Quando o instalador tentar finalizar a ordem
  Então o sistema deve informar as evidências pendentes
  E não deve marcar a instalação como concluída na API
```

```gherkin
Cenário: material adicional atualiza estoque e custo
  Dado que a equipe utilizou cabo adicional autorizado
  Quando a conciliação for confirmada
  Então deve ser gerado movimento de consumo
  E o custo realizado do projeto deve ser atualizado
  E o histórico deve registrar justificativa e responsável
```

## 21. Critérios de aprovação

- [ ] Gates e fluxo de agenda aprovados.
- [ ] Dados do projeto executivo definidos.
- [ ] Etapas de homologação/concessionária validadas.
- [ ] Templates de checklist definidos por tipo de projeto.
- [ ] Fotos, testes e seriais obrigatórios definidos.
- [ ] Fluxo de materiais no campo aprovado.
- [ ] Conferência e relatório de entrega aprovados.
- [ ] Experiência web móvel testada com instaladores.
