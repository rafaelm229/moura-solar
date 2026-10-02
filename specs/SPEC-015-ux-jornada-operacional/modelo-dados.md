# Modelo de apresentação — SPEC-015

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Não exige nova tabela de estado. Projeção de leitura proposta `JourneySummary`: subject (opportunityId ou projectId validado), customerId/utilityUnitId permitidos, commercialState/operationalState originais, fronts[], nextActions[], missingRequirements[], documentReferences[], historyCursor, observedAt e sourceRevisions.

| Campo                  | Fonte existente e restrição                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Etapa comercial        | Opportunity.state e OpportunityTransition                                                                                                      |
| Etapa operacional      | OperationalProject.state; não converter em estado comercial                                                                                    |
| Responsável            | Opportunity.ownerUserId, OperationalProject.engineerUserId, WorkOrder.assignedLeaderId/assignedTeamId, Activity.assigneeUserId conforme frente |
| Prazo                  | Activity.dueAt, WorkOrder.scheduledDate, HomologationProcess.deadlineAt; não inferir SLA inexistente                                           |
| Financeiro             | ProjectGate por opportunityId/gateType FINANCIAL e resumo financeiro; valores sensíveis filtrados                                              |
| Contrato               | Contract/ContractVersion/SignedContractReview e gate CONTRACT                                                                                  |
| Engenharia/homologação | ExecutiveDesign, HomologationProcess, WorkOrder e bloqueios do serviço responsável                                                             |
| Suprimentos            | StockReservation, itens, movimentos e disponibilidades do módulo; não inventar ProjectGate SUPPLY persistido se não existir                    |
| Documentos             | Projeção autorizada SPEC-013, mantendo ID de versão/origem                                                                                     |
| Histórico              | Transições, auditoria e eventos dos módulos; ordenação determinística por instante e ID                                                        |

Front tem `source`, `sourceEntityId` autorizado, status original, status de consulta (`fresh/stale/unavailable`), rótulo operacional, responsável/prazo opcionais, bloqueios e observação de atualização. Status de consulta é técnico, não de negócio. Ausência de dado mostra “Não definido”, nunca “Concluído”. Não calcular liberação juntando cores no frontend.

Fonte de ProjectGate no schema atual usa opportunityId, não projectId. Resolver OperationalProject → Opportunity ao consultar. Consumo continua em EnergyReading; não é copiado para JourneySummary persistido. Cache pode ser descartado; PostgreSQL/casos de uso continuam autoridade. Caso seja necessária projeção materializada futura, requer decisão e reconstrução por eventos com autorização; não incluída como obrigação desta evolução.

O histórico de SPEC-001 usa Gate C para proposta pronta, enquanto código M5 usa CONTRACT com comentário Gate C. Isso é divergência de nomenclatura a resolver no lote 0; não renomear gates ou ajustar comportamento nesta tarefa. Mostrar “Contrato: aguardando conferência” com código técnico em detalhe, baseado no módulo efetivo.
