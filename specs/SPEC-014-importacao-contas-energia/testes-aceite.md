# Testes de aceite — SPEC-014

**Status:** Aprovada para implementação em 05/10/2026

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo e contratos funcionais aprovados em 05/10/2026. Decisões operacionais listadas no plano continuam bloqueios das liberações correspondentes.

Testes futuros. Reaproveitar tests/design.integration.mjs e tests/e2e/design.spec.ts como regressão de consumo/dimensionamento; não representam cobertura de OCR/importação hoje.

| Teste    | Requisitos     | Cenário e resultado esperado                                                                                                                                    |
| -------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-IMP-01 | IMP-01, IMP-02 | PDF digital e foto: original READY antes de job; revisão obrigatória; UC 000123 preservada; classe rural não vira comercial; campos ausentes nulos              |
| T-IMP-02 | IMP-03, IMP-06 | Titular diferente, UC de outro cliente e outro tenant; alerta de titular, vínculo negado, comprador intacto e zero aplicação indevida                           |
| T-IMP-03 | IMP-04, IMP-08 | Conta com consumo/injeção/energia faturada/impostos e histórico parcial; valores distintos, meses ausentes não criados, tarifa de economia intacta              |
| T-IMP-04 | IMP-05, IMP-07 | Hash repetido, foto diferente da mesma fatura, revisão de fatura e mês manual existente; duplicidade/resolução explícita sem sobrescrita                        |
| T-IMP-05 | IMP-07         | Dois dispositivos confirmam, chaves iguais/diferentes, manual altera mês e injetar falha no terceiro mês; um recibo ou zero efeitos, nunca aplicação parcial    |
| T-IMP-06 | IMP-08, IMP-09 | Aplicar revisão autorizada e recarregar outro dispositivo; mesma EnergyReading, proveniência completa, caches atualizados e snapshots/PDFs históricos idênticos |
| T-IMP-07 | IMP-10         | Reiniciar worker/API após enqueue e após submissão externa; recuperar operationId/lease, limitar retries/custo e não perder job                                 |
| T-IMP-08 | IMP-01, IMP-10 | Documento ilegível, fornecedor fora, timeout e limite de orçamento; erro acionável, original disponível e entrada manual operante                               |
| T-IMP-09 | IMP-10         | Cancelar durante OCR/confirmar; resultado atrasado ignorado; apenas transição vencedora produz efeito                                                           |
| T-IMP-10 | IMP-11, IMP-12 | Trocar adapter mantendo fixture normalizada; documento com instruções maliciosas não executa comandos; ausência de confidence não gera percentual               |
| T-IMP-11 | IMP-01, IMP-12 | Teclado, sete viewports, câmera, zoom e erro de revisão; documento/campo comparáveis, foco preservado e alterações protegidas                                   |
| T-IMP-12 | IMP-06, IMP-07 | Revogar grant entre upload/revisão/confirm; API nega sem expor candidato ou mutar consumo; replay revalida autorização                                          |

PoC deve reportar taxa de correção por campo, cobertura de meses, erro crítico de UC/mês/unidade, latência, custo por conta e taxa de fallback manual por distribuidora/formato. Não declarar precisão da produção por amostra pequena.

Complementos verificáveis:

- T-IMP-01: antes de original READY não existe importação enfileirada; erro de criação após upload permite retomar sem reenviar bytes. Confirmar “Criar UC” deve vincular original por DocumentUtilityUnitLink e fazê-lo aparecer ao filtrar a UC; falha desse vínculo reverte toda aplicação.
- T-IMP-05: confirm repetido com mesma revisão/digest e chave diferente retorna 200/mesmo recibo; revisão diferente após APPLIED retorna 409. GET após timeout recupera recibo sem nova aplicação.
- T-IMP-07: queda após submissão sem operationId gera resultado desconhecido; consultar correlação ou exigir decisão antes de repetir possível custo.
- T-IMP-08: substituir documento ilegível cria nova versão e nova importação, preserva a anterior e não copia decisões; retry transitório conserva documentVersionId.
