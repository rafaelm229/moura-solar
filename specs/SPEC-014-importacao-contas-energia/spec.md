# SPEC-014 — Importação assistida de contas de energia

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo e contratos funcionais aprovados em 05/10/2026. Decisões operacionais listadas no plano continuam bloqueios das liberações correspondentes.

**Escopo vigente desde 09/10/2026:** a [ADR-008](../../docs/adr/ADR-008-importacao-manual-sem-ocr.md)
mantém intake, revisão e confirmação manuais e retira a PoC/extração automática
do roadmap atual. IMP-10 a IMP-12 e os desenhos de extração permanecem no
histórico desta SPEC; não autorizam worker, OCR ou envio a provedor.

Os requisitos IMP-01 a IMP-09 abaixo foram aprovados antes dessa decisão e
continuam aplicáveis com os critérios manuais atualizados nesta SPEC. Os requisitos
de processamento e extração IMP-10 a IMP-12 são históricos, não critérios de aceite
do fluxo vigente nem itens do roadmap. A importação padrão não depende de PoC,
fornecedor, worker ou serviço de leitura.

## Objetivo e escopo

No escopo vigente, preservar o original no dossiê e permitir que a pessoa transcreva, revise e confirme dados manualmente em UtilityUnit/EnergyReading, mantendo consultas de consumo e snapshots existentes. A entrada manual é o fluxo padrão. O objetivo histórico de reduzir transcrição por extração automática foi retirado pela ADR-008. Dependências: SPEC-002, SPEC-004, SPEC-005 e SPEC-013.

| ID     | Requisito                                                                                                   | Critério verificável                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| IMP-01 | Escolher cliente, selecionar/criar UC, enviar original, transcrever, revisar, resolver, confirmar e aplicar | Nenhuma leitura/cadastro alterado antes da confirmação humana; transcrição manual disponível                   |
| IMP-02 | Transcrever campos visíveis no original e registrar documento/página de referência quando aplicável         | Ausentes ficam nulos; código 000123 permanece texto; classe rural não vira comercial                           |
| IMP-03 | Titular distinto do comprador e divergências explícitas                                                     | Conta de terceiro gera alerta e decisão; Customer não é sobrescrito                                            |
| IMP-04 | Separar consumo, energia faturada, injetada e componentes tarifários                                        | Meses ausentes não são criados; total/consumo não define tarifa de economia                                    |
| IMP-05 | Detectar hash duplicado e conflitos UC/mês                                                                  | Segunda conta/reenvio exige decisão; mesmo mês nunca é sobrescrito silenciosamente                             |
| IMP-06 | Organização/proprietário/contexto validados na API                                                          | UC de outro cliente/organização é recusada antes de qualquer efeito                                            |
| IMP-07 | Confirmação transacional, concorrente e idempotente                                                         | Repetição/duplo dispositivo produz um recibo e aplicação integral, ou zero alterações                          |
| IMP-08 | Proveniência e fonte de consumo única                                                                       | EnergyReading mantém resultado confirmado com revisão/autor/documento e origem manual; não há consumo paralelo |
| IMP-09 | Atualizar dependências, preservar snapshots                                                                 | Consumo atual muda em dois dispositivos; versões aceitas e PDFs/contratos não mudam                            |
| IMP-10 | **Histórico, fora do escopo vigente:** processamento durável e limitado                                     | Não é critério de aceite da importação manual; worker/OCR não autorizados                                      |
| IMP-11 | **Histórico, fora do escopo vigente:** adapter substituível e prova de conceito                             | POC-01 encerrada sem execução; nenhum fornecedor ou experimento planejado                                      |
| IMP-12 | **Histórico, fora do escopo vigente:** candidatos de extração e sinais distintos                            | Candidatos/confiança de OCR não fazem parte do fluxo manual                                                    |

Fora: autoaprovação, contratação de fornecedor, mudança de cálculo de economia, faturamento/compensação tarifária automática, completar histórico por inferência, atualizar contratos/propostas emitidos, escolher comprador pelo titular ou trocar propriedade de UC.

**Evidência transacional:** o [R1-46](../../docs/r1-46-rollback-confirmacao-importacao.md)
injeta falha no insert do evento de confirmação e verifica que a operação manual
reverte integralmente, conforme IMP-07. A falha é exclusiva do teste; não cria
trigger ou regra no banco de aplicação.

## Complementos

- [Modelo de dados](modelo-dados.md).
- [API](api.md).
- [Fluxos UX](fluxos-ux.md).
- [Testes de aceite](testes-aceite.md).
- [Pesquisa histórica da PoC e fontes consultadas](prova-conceito.md); não executar
  conforme ADR-008.
- [Proposta histórica de processamento, supersedida pela ADR-008](../../docs/adr/ADR-004-importacao-assistida-duravel.md).
