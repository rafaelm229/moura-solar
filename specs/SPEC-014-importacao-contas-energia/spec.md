# SPEC-014 — Importação assistida de contas de energia

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo e contratos funcionais aprovados em 05/10/2026. Decisões operacionais listadas no plano continuam bloqueios das liberações correspondentes.

## Objetivo e escopo

Reduzir transcrição manual, preservando o original no dossiê e submetendo candidatos à revisão humana obrigatória na primeira versão. Extração nunca é aprovação. Reutilizar UtilityUnit/EnergyReading, consultas de consumo e snapshots existentes. Dependências: SPEC-002, SPEC-004, SPEC-005 e SPEC-013.

| ID     | Requisito                                                                                               | Critério verificável                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| IMP-01 | Escolher cliente, selecionar/criar UC, enviar original, extrair, revisar, resolver, confirmar e aplicar | Nenhuma leitura/cadastro alterado antes da confirmação humana; manual continua disponível                           |
| IMP-02 | Extrair apenas campos presentes com origem/página                                                       | Ausentes ficam nulos; código 000123 permanece texto; classe rural não vira comercial                                |
| IMP-03 | Titular distinto do comprador e divergências explícitas                                                 | Conta de terceiro gera alerta e decisão; Customer não é sobrescrito                                                 |
| IMP-04 | Separar consumo, energia faturada, injetada e componentes tarifários                                    | Meses ausentes não são criados; total/consumo não define tarifa de economia                                         |
| IMP-05 | Detectar hash duplicado e conflitos UC/mês                                                              | Segunda conta/reenvio exige decisão; mesmo mês nunca é sobrescrito silenciosamente                                  |
| IMP-06 | Organização/proprietário/contexto validados na API                                                      | UC de outro cliente/organização é recusada antes de qualquer efeito                                                 |
| IMP-07 | Confirmação transacional, concorrente e idempotente                                                     | Repetição/duplo dispositivo produz um recibo e aplicação integral, ou zero alterações                               |
| IMP-08 | Proveniência e fonte de consumo única                                                                   | EnergyReading mantém resultado confirmado com revisão/autor/documento/extrator; não há consumo operacional paralelo |
| IMP-09 | Atualizar dependências, preservar snapshots                                                             | Consumo atual muda em dois dispositivos; versões aceitas e PDFs/contratos não mudam                                 |
| IMP-10 | Processamento durável e limitado                                                                        | Reinício, timeout, retry, cancelamento e fornecedor indisponível são observáveis e recuperáveis                     |
| IMP-11 | Adapter substituível e prova de conceito                                                                | Comparação documentada por distribuidora/formato, idioma, versão, privacidade e custo, sem promessa universal       |
| IMP-12 | Documento não confiável e sinais distintos                                                              | Texto que ordena ações não executa nada; confidence ausente fica ausente; qualidade e validações separadas          |

Fora: autoaprovação, contratação de fornecedor, mudança de cálculo de economia, faturamento/compensação tarifária automática, completar histórico por inferência, atualizar contratos/propostas emitidos, escolher comprador pelo titular ou trocar propriedade de UC.

## Complementos

- [Modelo de dados](modelo-dados.md).
- [API](api.md).
- [Fluxos UX](fluxos-ux.md).
- [Testes de aceite](testes-aceite.md).
- [Prova de conceito e fontes oficiais](prova-conceito.md).
- [ADR de processamento](../../docs/adr/ADR-004-importacao-assistida-duravel.md).
