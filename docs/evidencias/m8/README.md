# Evidências do M8 — Engenharia, Homologação, Agenda, Ordens de Serviço e Instalações (SPEC-010)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                         | Resultado                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                        | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) 100% aprovados                          |
| Unitários API                       | Validações de transições de projeto executivo, geração de checklists de 6 seções e regras de comissionamento        |
| `tests/engineering.integration.mjs` | 8 cenários HTTP/PostgreSQL cobrindo projeto executivo, homologação na concessionária, OS e comissionamento com foto |
| `pnpm test:migrations`              | Upgrade sequencial M0 a M8 preserva integridade; reaplicação idempotente aprovada                                   |
| Gate de Projeto Executivo           | Bloqueio estrito de agendamento de instalação sem aprovação formal do projeto executivo (HTTP 422)                  |
| Homologação e Concessionária        | Rastreio de protocolo, solicitação de parecer de acesso, vistoria e troca de medidor bidirecional                   |
| Ordens de Serviço & Checklist       | OS com 8 itens em 6 seções (Segurança, Estrutura, Módulos, Inversor, Proteções, Conexão CA/CC)                      |
| Comissionamento & Aceite            | Medições técnicas (Voc, Isc, aterramento), fotos de evidência e assinatura digital do cliente na entrega da usina   |

## Jornadas e Cenários Validados

1. **Criação do Projeto Operacional:**
   - Criação a partir do contrato assinado (Gate C) em estado `PREPARATION`.
   - Vinculação com a Unidade Consumidora, Oportunidade e dados técnicos de dimensionamento.

2. **Projeto Executivo e Homologação:**
   - Elaboração e versionamento do projeto elétrico executivo e ART/TRT.
   - Atualização do estágio de homologação: Solicitação de Acesso, Análise, Vistoria Solicitada, Vistoria Aprovada, Troca de Medidor.

3. **Agendamento e Emissão de Ordem de Serviço (OS):**
   - Validação prévia de aprovação do projeto executivo (tentativas antes da aprovação recebem 422 Unprocessable Entity).
   - Atribuição de equipe técnica e instaladores.
   - Geração automática da árvore de checklist de conformidade técnica em 6 seções.

4. **Execução de Campo e Checklist Técnico:**
   - Início da OS com registro de data/hora real de início.
   - Preenchimento de checklist de campo: verificação de EPI, aperto estrutural, medição de tensão de circuito aberto (Voc) e isolamento.
   - Upload e fixação de fotos comprobatórias por item de inspeção.

5. **Comissionamento e Termo de Entrega (Handover):**
   - Registro de primeira geração e sincronismo com a rede.
   - Coleta de assinatura digital do cliente na entrega técnica (Touch signature).
   - Transição da usina para o estado `COMMISSIONED` / `OPERATIONAL`.
